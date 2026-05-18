const express = require('express');
const path = require('path');
require('dotenv').config();
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

pool.connect()
  .then(() => console.log('✅ Conectado ao PostgreSQL'))
  .catch(err => console.error('Erro ao conectar ao banco:', err.message));

const asyncGet = (sql, params = []) => pool.query(sql, params).then(r => r.rows[0]);
const asyncAll = (sql, params = []) => pool.query(sql, params).then(r => r.rows);
const asyncRun = (sql, params = []) => pool.query(sql, params).then(r => ({ rowCount: r.rowCount, id: r.rows[0]?.id }));

// ── Auth ──
app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    const user = await asyncGet('SELECT * FROM usuarios WHERE email = $1 AND senha_hash = $2', [email, senha]);
    if (!user) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    res.json({ id: user.id, nome: user.nome, email: user.email, role: user.role, loja_id: user.loja_id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Lojas ──
app.get('/api/lojas', async (req, res) => {
  try { res.json(await asyncAll('SELECT * FROM lojas')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/lojas', async (req, res) => {
  try {
    const { nome, cnpj, endereco, telefone, email, logo } = req.body;
    const r = await asyncRun('INSERT INTO lojas (nome, cnpj, endereco, telefone, email, logo) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [nome, cnpj, endereco, telefone, email, logo]);
    res.status(201).json({ id: r.id, nome });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Produtos ──
app.get('/api/produtos', async (req, res) => {
  try {
    const { q, ativo } = req.query;
    let sql = 'SELECT * FROM produtos WHERE 1=1';
    const params = [];
    let i = 1;
    if (ativo !== undefined) { sql += ` AND ativo = $${i++}`; params.push(Number(ativo)); }
    if (q) { sql += ` AND (nome ILIKE $${i} OR sku ILIKE $${i} OR categoria ILIKE $${i})`; params.push(`%${q}%`); i++; }
    sql += ' ORDER BY nome';
    res.json(await asyncAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/produtos/:id', async (req, res) => {
  try {
    const p = await asyncGet('SELECT * FROM produtos WHERE id = $1', [req.params.id]);
    if (!p) return res.status(404).json({ error: 'Produto não encontrado.' });
    res.json(p);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/produtos', async (req, res) => {
  try {
    const { sku, nome, descricao, categoria, preco_venda, custo, estoque_atual = 0 } = req.body;
    const r = await asyncRun(
      'INSERT INTO produtos (sku, nome, descricao, categoria, preco_venda, custo, estoque_atual, ativo) VALUES ($1,$2,$3,$4,$5,$6,$7,1) RETURNING id',
      [sku, nome, descricao, categoria, preco_venda, custo, estoque_atual]);
    res.status(201).json({ id: r.id, sku, nome });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/produtos/:id', async (req, res) => {
  try {
    const { nome, descricao, categoria, preco_venda, custo, ativo } = req.body;
    await asyncRun(
      'UPDATE produtos SET nome=$1, descricao=$2, categoria=$3, preco_venda=$4, custo=$5, ativo=$6 WHERE id=$7',
      [nome, descricao, categoria, preco_venda, custo, ativo, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Estoque ──
app.get('/api/estoque', async (req, res) => {
  try {
    res.json(await asyncAll('SELECT id, sku, nome, categoria, estoque_atual, custo, preco_venda FROM produtos WHERE ativo = 1 ORDER BY nome'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/estoque/movimentacoes', async (req, res) => {
  try {
    res.json(await asyncAll(`
      SELECT em.*, p.nome AS produto_nome, u.nome AS usuario_nome
      FROM estoque_mov em
      JOIN produtos p ON em.produto_id = p.id
      LEFT JOIN usuarios u ON em.usuario_id = u.id
      ORDER BY em.data DESC LIMIT 200`));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/estoque/entrada', async (req, res) => {
  try {
    const { produto_id, quantidade, usuario_id, observacao } = req.body;
    await asyncRun('UPDATE produtos SET estoque_atual = estoque_atual + $1 WHERE id = $2', [quantidade, produto_id]);
    await asyncRun('INSERT INTO estoque_mov (produto_id, tipo, quantidade, data, usuario_id, observacao) VALUES ($1,$2,$3,$4,$5,$6)',
      [produto_id, 'entrada', quantidade, new Date().toISOString(), usuario_id, observacao]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/estoque/saida', async (req, res) => {
  try {
    const { produto_id, quantidade, usuario_id, observacao } = req.body;
    const p = await asyncGet('SELECT estoque_atual FROM produtos WHERE id = $1', [produto_id]);
    if (p.estoque_atual < quantidade) return res.status(400).json({ error: 'Estoque insuficiente.' });
    await asyncRun('UPDATE produtos SET estoque_atual = estoque_atual - $1 WHERE id = $2', [quantidade, produto_id]);
    await asyncRun('INSERT INTO estoque_mov (produto_id, tipo, quantidade, data, usuario_id, observacao) VALUES ($1,$2,$3,$4,$5,$6)',
      [produto_id, 'saida', quantidade, new Date().toISOString(), usuario_id, observacao]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/estoque/ajuste', async (req, res) => {
  try {
    const { produto_id, quantidade_nova, usuario_id, observacao } = req.body;
    const p = await asyncGet('SELECT estoque_atual FROM produtos WHERE id = $1', [produto_id]);
    const diff = quantidade_nova - p.estoque_atual;
    await asyncRun('UPDATE produtos SET estoque_atual = $1 WHERE id = $2', [quantidade_nova, produto_id]);
    await asyncRun('INSERT INTO estoque_mov (produto_id, tipo, quantidade, data, usuario_id, observacao) VALUES ($1,$2,$3,$4,$5,$6)',
      [produto_id, 'ajuste', diff, new Date().toISOString(), usuario_id, observacao || 'Ajuste manual']);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Vendas ──
app.get('/api/vendas', async (req, res) => {
  try {
    res.json(await asyncAll(`
      SELECT v.*, l.nome AS loja_nome, u.nome AS vendedor_nome
      FROM vendas v
      JOIN lojas l ON v.loja_id = l.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      ORDER BY v.data DESC LIMIT 200`));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/vendas/:id', async (req, res) => {
  try {
    const venda = await asyncGet('SELECT * FROM vendas WHERE id = $1', [req.params.id]);
    if (!venda) return res.status(404).json({ error: 'Venda não encontrada.' });
    const itens = await asyncAll(`
      SELECT iv.*, CASE WHEN iv.is_kit = 1 THEN k.nome ELSE p.nome END AS produto_nome
      FROM itens_venda iv
      LEFT JOIN produtos p ON iv.produto_id = p.id AND iv.is_kit = 0
      LEFT JOIN kits k ON iv.produto_id = k.id AND iv.is_kit = 1
      WHERE iv.venda_id = $1`, [req.params.id]);
    res.json({ ...venda, itens });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/vendas', async (req, res) => {
  try {
    const { loja_id, usuario_id, vendedor_id, forma_pagamento, itens, desconto, campanha_id, cliente_id, pontos_usados, is_delivery, endereco_entrega, taxa_entrega } = req.body;
    if (!itens || itens.length === 0) return res.status(400).json({ error: 'Nenhum item informado.' });

    let subtotal = 0;
    for (const item of itens) {
      if (item.is_kit) {
        const k = await asyncGet('SELECT * FROM kits WHERE id = $1', [item.produto_id]);
        if (!k) return res.status(400).json({ error: `Kit ${item.produto_id} não encontrado.` });
        const kitProdutos = await asyncAll('SELECT * FROM kit_produtos WHERE kit_id = $1', [k.id]);
        for (const kp of kitProdutos) {
          const p = await asyncGet('SELECT * FROM produtos WHERE id = $1', [kp.produto_id]);
          if (p.estoque_atual < kp.quantidade * item.quantidade) return res.status(400).json({ error: `Estoque insuficiente de ${p.nome}.` });
        }
        subtotal += k.preco_venda * item.quantidade;
        item._preco = k.preco_venda;
        item._kitProdutos = kitProdutos;
      } else {
        const p = await asyncGet('SELECT * FROM produtos WHERE id = $1', [item.produto_id]);
        if (!p) return res.status(400).json({ error: `Produto ${item.produto_id} não encontrado.` });
        if (p.estoque_atual < item.quantidade) return res.status(400).json({ error: `Estoque insuficiente para ${p.nome}.` });
        subtotal += p.preco_venda * item.quantidade;
        item._preco = p.preco_venda;
      }
    }

    let descontoPontos = 0;
    if (cliente_id && pontos_usados) {
      descontoPontos = pontos_usados * 0.05;
      await asyncRun('UPDATE clientes SET pontos = pontos - $1 WHERE id = $2', [pontos_usados, cliente_id]);
    }

    const valorFrete = parseFloat(taxa_entrega) || 0;
    const totalFinal = Math.max(0, subtotal - (desconto || 0) - descontoPontos) + valorFrete;
    const data = new Date().toISOString();

    const vendaRes = await asyncRun(
      'INSERT INTO vendas (data, loja_id, usuario_id, total, forma_pagamento, desconto, campanha_id, taxa_entrega) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
      [data, loja_id, usuario_id, totalFinal, forma_pagamento, desconto || 0, campanha_id || null, valorFrete]);
    const venda_id = vendaRes.id;

    for (const item of itens) {
      if (item.is_kit) {
        await asyncRun('INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, is_kit) VALUES ($1,$2,$3,$4,1)',
          [venda_id, item.produto_id, item.quantidade, item._preco]);
        for (const kp of item._kitProdutos) {
          const qty = kp.quantidade * item.quantidade;
          await asyncRun('UPDATE produtos SET estoque_atual = estoque_atual - $1 WHERE id = $2', [qty, kp.produto_id]);
          await asyncRun('INSERT INTO estoque_mov (produto_id, tipo, quantidade, data, usuario_id, observacao) VALUES ($1,$2,$3,$4,$5,$6)',
            [kp.produto_id, 'saida', qty, data, usuario_id, `Venda Kit #${venda_id}`]);
        }
      } else {
        await asyncRun('INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, is_kit) VALUES ($1,$2,$3,$4,0)',
          [venda_id, item.produto_id, item.quantidade, item._preco]);
        await asyncRun('UPDATE produtos SET estoque_atual = estoque_atual - $1 WHERE id = $2', [item.quantidade, item.produto_id]);
        await asyncRun('INSERT INTO estoque_mov (produto_id, tipo, quantidade, data, usuario_id, observacao) VALUES ($1,$2,$3,$4,$5,$6)',
          [item.produto_id, 'saida', item.quantidade, data, usuario_id, `Venda #${venda_id}`]);
      }
    }

    if (cliente_id) {
      const pontosGanhos = Math.floor(totalFinal - valorFrete);
      await asyncRun('UPDATE clientes SET pontos = pontos + $1 WHERE id = $2', [pontosGanhos, cliente_id]);
    }

    if (is_delivery) {
      await asyncRun('INSERT INTO entregas (venda_id, entregador_id, endereco, status, data_criacao, data_atualizacao) VALUES ($1,NULL,$2,$3,$4,$5)',
        [venda_id, endereco_entrega || 'Endereço não informado', 'aguardando', data, data]);
    }

    const idVendedorComissao = vendedor_id || usuario_id;
    if (idVendedorComissao) {
      await asyncRun('INSERT INTO comissoes (venda_id, usuario_id, valor) VALUES ($1,$2,$3)',
        [venda_id, idVendedorComissao, totalFinal * 0.05]);
    }

    res.status(201).json({ id: venda_id, total: totalFinal });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Clientes ──
app.get('/api/clientes', async (req, res) => {
  try {
    const { q } = req.query;
    let sql = 'SELECT * FROM clientes';
    const params = [];
    if (q) { sql += ' WHERE nome ILIKE $1 OR cpf_cnpj ILIKE $1 OR email ILIKE $1'; params.push(`%${q}%`); }
    sql += ' ORDER BY nome';
    res.json(await asyncAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clientes', async (req, res) => {
  try {
    const { nome, cpf_cnpj, email, telefone } = req.body;
    const r = await asyncRun('INSERT INTO clientes (nome, cpf_cnpj, email, telefone, pontos) VALUES ($1,$2,$3,$4,0) RETURNING id',
      [nome, cpf_cnpj, email, telefone]);
    res.status(201).json({ id: r.id, nome });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Kits ──
app.get('/api/kits', async (req, res) => {
  try {
    const kits = await asyncAll('SELECT * FROM kits WHERE ativo = 1 ORDER BY nome');
    for (let k of kits) {
      k.produtos = await asyncAll('SELECT kp.*, p.nome FROM kit_produtos kp JOIN produtos p ON kp.produto_id = p.id WHERE kp.kit_id = $1', [k.id]);
    }
    res.json(kits);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/kits', async (req, res) => {
  try {
    const { sku, nome, preco_venda, produtos } = req.body;
    const r = await asyncRun('INSERT INTO kits (sku, nome, preco_venda) VALUES ($1,$2,$3) RETURNING id', [sku, nome, preco_venda]);
    for (let p of produtos) {
      await asyncRun('INSERT INTO kit_produtos (kit_id, produto_id, quantidade) VALUES ($1,$2,$3)', [r.id, p.produto_id, p.quantidade]);
    }
    res.status(201).json({ id: r.id, sku, nome });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Entregadores / Entregas ──
app.get('/api/entregadores', async (req, res) => {
  try { res.json(await asyncAll('SELECT * FROM entregadores ORDER BY nome')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/entregadores', async (req, res) => {
  try {
    const { nome, veiculo, placa, telefone } = req.body;
    const r = await asyncRun('INSERT INTO entregadores (nome, veiculo, placa, telefone) VALUES ($1,$2,$3,$4) RETURNING id', [nome, veiculo, placa, telefone]);
    res.status(201).json({ id: r.id, nome });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/entregas', async (req, res) => {
  try {
    res.json(await asyncAll(`
      SELECT e.*, v.total, ent.nome AS entregador_nome
      FROM entregas e
      JOIN vendas v ON e.venda_id = v.id
      LEFT JOIN entregadores ent ON e.entregador_id = ent.id
      ORDER BY e.data_criacao DESC LIMIT 100`));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/entregas/:id/status', async (req, res) => {
  try {
    const { status, entregador_id } = req.body;
    let sql = 'UPDATE entregas SET status = $1, data_atualizacao = $2';
    let params = [status, new Date().toISOString()];
    if (entregador_id !== undefined) { sql += ', entregador_id = $3 WHERE id = $4'; params.push(entregador_id, req.params.id); }
    else { sql += ' WHERE id = $3'; params.push(req.params.id); }
    await asyncRun(sql, params);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/mensageria/disparo', async (req, res) => {
  try {
    const { publico, canal, mensagem } = req.body;
    const clientes = await asyncAll('SELECT * FROM clientes');
    let alvoCount = publico === 'todos' ? clientes.length : publico === 'ouro' ? clientes.filter(c => c.pontos >= 1000).length : Math.floor(clientes.length / 2);
    console.log(`[Mensageria] Disparando via ${canal} para ${alvoCount} clientes.`);
    res.json({ success: true, count: alvoCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Vendedores / Comissões ──
app.get('/api/vendedores', async (req, res) => {
  try { res.json(await asyncAll("SELECT id, nome, email FROM usuarios WHERE role IN ('vendedor', 'superadmin', 'gestor') ORDER BY nome")); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/vendedores', async (req, res) => {
  try {
    const { nome, email, senha, loja_id } = req.body;
    const r = await asyncRun('INSERT INTO usuarios (nome, email, senha_hash, role, loja_id) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [nome, email, senha, 'vendedor', loja_id || 1]);
    res.status(201).json({ id: r.id, nome });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/comissoes', async (req, res) => {
  try {
    res.json(await asyncAll(`
      SELECT u.nome AS vendedor, COUNT(c.id) AS total_vendas, SUM(c.valor) AS total_comissao, SUM(v.total) as total_vendido
      FROM comissoes c
      JOIN usuarios u ON c.usuario_id = u.id
      JOIN vendas v ON c.venda_id = v.id
      GROUP BY u.id, u.nome ORDER BY total_comissao DESC`));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Campanhas ──
app.get('/api/campanhas', async (req, res) => {
  try { res.json(await asyncAll('SELECT * FROM campanhas ORDER BY nome')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/campanhas', async (req, res) => {
  try {
    const { nome, codigo_cupom, tipo_desconto, valor_desconto } = req.body;
    const r = await asyncRun('INSERT INTO campanhas (nome, codigo_cupom, tipo_desconto, valor_desconto, ativo) VALUES ($1,$2,$3,$4,1) RETURNING id',
      [nome, codigo_cupom.trim().toUpperCase(), tipo_desconto, valor_desconto]);
    res.status(201).json({ id: r.id, nome });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/campanhas/:id/status', async (req, res) => {
  try {
    await asyncRun('UPDATE campanhas SET ativo = $1 WHERE id = $2', [req.body.ativo, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/campanhas/validar/:codigo', async (req, res) => {
  try {
    const camp = await asyncGet('SELECT * FROM campanhas WHERE codigo_cupom = $1 AND ativo = 1', [req.params.codigo.trim().toUpperCase()]);
    if (!camp) return res.status(404).json({ error: 'Cupom inválido ou inativo.' });
    res.json(camp);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Despesas ──
app.get('/api/despesas', async (req, res) => {
  try { res.json(await asyncAll('SELECT * FROM despesas ORDER BY data DESC LIMIT 200')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/despesas', async (req, res) => {
  try {
    const { descricao, valor, categoria, loja_id } = req.body;
    const r = await asyncRun('INSERT INTO despesas (descricao, valor, data, categoria, loja_id) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [descricao, parseFloat(valor), new Date().toISOString(), categoria || 'Outros', loja_id || 1]);
    res.status(201).json({ id: r.id, descricao });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/despesas/:id', async (req, res) => {
  try {
    await asyncRun('DELETE FROM despesas WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/financeiro/fluxo-caixa', async (req, res) => {
  try {
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const receitas = await asyncGet('SELECT COALESCE(SUM(total), 0) AS total FROM vendas WHERE data >= $1', [inicioMes]);
    const despesas = await asyncGet('SELECT COALESCE(SUM(valor), 0) AS total FROM despesas WHERE data >= $1', [inicioMes]);
    res.json({ receitas: receitas.total, despesas: despesas.total, saldo: receitas.total - despesas.total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Dashboard ──
app.get('/api/dashboard', async (req, res) => {
  try {
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const hoje = new Date().toISOString().split('T')[0];
    const [totalMes, totalDia, qtdVendas, totalClientes, totalProdutos, estoqueMin, topProdutos] = await Promise.all([
      asyncGet('SELECT COALESCE(SUM(total), 0) AS valor FROM vendas WHERE data >= $1', [inicioMes]),
      asyncGet('SELECT COALESCE(SUM(total), 0) AS valor FROM vendas WHERE data::date = $1', [hoje]),
      asyncGet('SELECT COUNT(*) AS qtd FROM vendas WHERE data >= $1', [inicioMes]),
      asyncGet('SELECT COUNT(*) AS qtd FROM clientes'),
      asyncGet('SELECT COUNT(*) AS qtd FROM produtos WHERE ativo = 1'),
      asyncAll('SELECT nome, estoque_atual FROM produtos WHERE estoque_atual <= 5 AND ativo = 1 ORDER BY estoque_atual'),
      asyncAll('SELECT p.nome, SUM(iv.quantidade) AS total_vendido FROM itens_venda iv JOIN produtos p ON iv.produto_id = p.id GROUP BY p.id, p.nome ORDER BY total_vendido DESC LIMIT 5'),
    ]);
    res.json({ totalMes: totalMes.valor, totalDia: totalDia.valor, qtdVendas: qtdVendas.qtd,
      totalClientes: totalClientes.qtd, totalProdutos: totalProdutos.qtd, estoqueMin, topProdutos });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => console.log(`🚀 VarejoOS rodando em http://localhost:${PORT}`));

module.exports = app;
