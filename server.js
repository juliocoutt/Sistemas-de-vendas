const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;
const DATABASE_URL = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: DATABASE_URL });

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ──────────────────────────────────────────────────────────────
// Banco de dados
// ──────────────────────────────────────────────────────────────
pool.connect()
  .then(() => console.log('✅ Conectado ao Supabase (PostgreSQL)'))
  .catch(err => { console.error('Erro ao conectar ao banco:', err.message); process.exit(1); });
inicializarBanco();

function inicializarBanco() {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema, (err) => {
    if (err) { console.error('Erro ao executar schema:', err.message); return; }
    
    // Migrações dinâmicas
    db.run("CREATE TABLE IF NOT EXISTS campanhas (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, codigo_cupom TEXT UNIQUE, tipo_desconto TEXT, valor_desconto REAL, ativo INTEGER DEFAULT 1)");
    db.run("ALTER TABLE vendas ADD COLUMN desconto REAL DEFAULT 0", () => {});
    db.run("ALTER TABLE vendas ADD COLUMN campanha_id INTEGER", () => {});
    db.run("CREATE TABLE IF NOT EXISTS despesas (id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, valor REAL, data TEXT, categoria TEXT, loja_id INTEGER)");
    db.run("CREATE TABLE IF NOT EXISTS kits (id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT UNIQUE, nome TEXT, preco_venda REAL, ativo INTEGER DEFAULT 1)");
    db.run("CREATE TABLE IF NOT EXISTS kit_produtos (kit_id INTEGER, produto_id INTEGER, quantidade INTEGER, FOREIGN KEY(kit_id) REFERENCES kits(id), FOREIGN KEY(produto_id) REFERENCES produtos(id))");
    db.run("ALTER TABLE itens_venda ADD COLUMN is_kit INTEGER DEFAULT 0", () => {});
    db.run("CREATE TABLE IF NOT EXISTS entregadores (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, veiculo TEXT, placa TEXT, telefone TEXT, status TEXT DEFAULT 'disponivel')");
    db.run("CREATE TABLE IF NOT EXISTS entregas (id INTEGER PRIMARY KEY AUTOINCREMENT, venda_id INTEGER, entregador_id INTEGER, endereco TEXT, status TEXT DEFAULT 'aguardando', data_criacao TEXT, data_atualizacao TEXT)");
    db.run("ALTER TABLE vendas ADD COLUMN taxa_entrega REAL DEFAULT 0", () => {});

    console.log('✅ Tabelas verificadas/criadas com sucesso.');
    seedDadosIniciais();
  });
}

// Seed data is managed directly in Supabase. No local seeding required.

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
const asyncGet = (sql, params = []) => pool.query(sql, params).then(r => r.rows[0]);
const asyncAll = (sql, params = []) => pool.query(sql, params).then(r => r.rows);
const asyncRun = (sql, params = []) => pool.query(sql, params).then(r => ({ changes: r.rowCount }));

// ──────────────────────────────────────────────────────────────
// ROTAS: Autenticação
// ──────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    const user = await asyncGet('SELECT * FROM usuarios WHERE email = ? AND senha_hash = ?', [email, senha]);
    if (!user) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    res.json({ id: user.id, nome: user.nome, email: user.email, role: user.role, loja_id: user.loja_id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ──────────────────────────────────────────────────────────────
// ROTAS: Lojas
// ──────────────────────────────────────────────────────────────
app.get('/api/lojas', async (req, res) => {
  try { res.json(await asyncAll('SELECT * FROM lojas')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/lojas', async (req, res) => {
  try {
    const { nome, cnpj, endereco, telefone, email, logo } = req.body;
    const r = await asyncRun('INSERT INTO lojas (nome, cnpj, endereco, telefone, email, logo) VALUES (?,?,?,?,?,?)',
      [nome, cnpj, endereco, telefone, email, logo]);
    res.status(201).json({ id: r.id, nome });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ──────────────────────────────────────────────────────────────
// ROTAS: Produtos
// ──────────────────────────────────────────────────────────────
app.get('/api/produtos', async (req, res) => {
  try {
    const { q, ativo } = req.query;
    let sql = 'SELECT * FROM produtos WHERE 1=1';
    const params = [];
    if (ativo !== undefined) { sql += ' AND ativo = ?'; params.push(Number(ativo)); }
    if (q) { sql += ' AND (nome LIKE ? OR sku LIKE ? OR categoria LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    sql += ' ORDER BY nome';
    res.json(await asyncAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/produtos/:id', async (req, res) => {
  try {
    const p = await asyncGet('SELECT * FROM produtos WHERE id = ?', [req.params.id]);
    if (!p) return res.status(404).json({ error: 'Produto não encontrado.' });
    res.json(p);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/produtos', async (req, res) => {
  try {
    const { sku, nome, descricao, categoria, preco_venda, custo, estoque_atual = 0 } = req.body;
    const r = await asyncRun(
      'INSERT INTO produtos (sku, nome, descricao, categoria, preco_venda, custo, estoque_atual, ativo) VALUES (?,?,?,?,?,?,?,1)',
      [sku, nome, descricao, categoria, preco_venda, custo, estoque_atual]);
    res.status(201).json({ id: r.id, sku, nome });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/produtos/:id', async (req, res) => {
  try {
    const { nome, descricao, categoria, preco_venda, custo, ativo } = req.body;
    await asyncRun(
      'UPDATE produtos SET nome=?, descricao=?, categoria=?, preco_venda=?, custo=?, ativo=? WHERE id=?',
      [nome, descricao, categoria, preco_venda, custo, ativo, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ──────────────────────────────────────────────────────────────
// ROTAS: Estoque
// ──────────────────────────────────────────────────────────────
app.get('/api/estoque', async (req, res) => {
  try {
    const itens = await asyncAll(`
      SELECT p.id, p.sku, p.nome, p.categoria, p.estoque_atual, p.custo, p.preco_venda
      FROM produtos p WHERE p.ativo = 1 ORDER BY p.nome`);
    res.json(itens);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/estoque/movimentacoes', async (req, res) => {
  try {
    const movs = await asyncAll(`
      SELECT em.*, p.nome AS produto_nome, u.nome AS usuario_nome
      FROM estoque_mov em
      JOIN produtos p ON em.produto_id = p.id
      LEFT JOIN usuarios u ON em.usuario_id = u.id
      ORDER BY em.data DESC LIMIT 200`);
    res.json(movs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/estoque/entrada', async (req, res) => {
  try {
    const { produto_id, quantidade, usuario_id, observacao } = req.body;
    await asyncRun('UPDATE produtos SET estoque_atual = estoque_atual + ? WHERE id = ?', [quantidade, produto_id]);
    await asyncRun('INSERT INTO estoque_mov (produto_id, tipo, quantidade, data, usuario_id, observacao) VALUES (?,?,?,?,?,?)',
      [produto_id, 'entrada', quantidade, new Date().toISOString(), usuario_id, observacao]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/estoque/saida', async (req, res) => {
  try {
    const { produto_id, quantidade, usuario_id, observacao } = req.body;
    const p = await asyncGet('SELECT estoque_atual FROM produtos WHERE id = ?', [produto_id]);
    if (p.estoque_atual < quantidade) return res.status(400).json({ error: 'Estoque insuficiente.' });
    await asyncRun('UPDATE produtos SET estoque_atual = estoque_atual - ? WHERE id = ?', [quantidade, produto_id]);
    await asyncRun('INSERT INTO estoque_mov (produto_id, tipo, quantidade, data, usuario_id, observacao) VALUES (?,?,?,?,?,?)',
      [produto_id, 'saida', quantidade, new Date().toISOString(), usuario_id, observacao]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/estoque/ajuste', async (req, res) => {
  try {
    const { produto_id, quantidade_nova, usuario_id, observacao } = req.body;
    const p = await asyncGet('SELECT estoque_atual FROM produtos WHERE id = ?', [produto_id]);
    const diff = quantidade_nova - p.estoque_atual;
    await asyncRun('UPDATE produtos SET estoque_atual = ? WHERE id = ?', [quantidade_nova, produto_id]);
    await asyncRun('INSERT INTO estoque_mov (produto_id, tipo, quantidade, data, usuario_id, observacao) VALUES (?,?,?,?,?,?)',
      [produto_id, 'ajuste', diff, new Date().toISOString(), usuario_id, observacao || 'Ajuste manual']);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ──────────────────────────────────────────────────────────────
// ROTAS: Vendas
// ──────────────────────────────────────────────────────────────
app.get('/api/vendas', async (req, res) => {
  try {
    const vendas = await asyncAll(`
      SELECT v.*, l.nome AS loja_nome, u.nome AS vendedor_nome
      FROM vendas v
      JOIN lojas l ON v.loja_id = l.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      ORDER BY v.data DESC LIMIT 200`);
    res.json(vendas);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/vendas/:id', async (req, res) => {
  try {
    const venda = await asyncGet('SELECT * FROM vendas WHERE id = ?', [req.params.id]);
    if (!venda) return res.status(404).json({ error: 'Venda não encontrada.' });
    const itens = await asyncAll(`
      SELECT iv.*, 
             CASE WHEN iv.is_kit = 1 THEN k.nome ELSE p.nome END AS produto_nome
      FROM itens_venda iv 
      LEFT JOIN produtos p ON iv.produto_id = p.id AND iv.is_kit = 0
      LEFT JOIN kits k ON iv.produto_id = k.id AND iv.is_kit = 1
      WHERE iv.venda_id = ?`, [req.params.id]);
    res.json({ ...venda, itens });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/vendas', async (req, res) => {
  try {
    const { loja_id, usuario_id, vendedor_id, forma_pagamento, itens, desconto, campanha_id, cliente_id, pontos_usados, is_delivery, endereco_entrega, taxa_entrega } = req.body;
    if (!itens || itens.length === 0) return res.status(400).json({ error: 'Nenhum item informado.' });

    // Calcula total e verifica estoque
    let subtotal = 0;
    for (const item of itens) {
      if (item.is_kit) {
        const k = await asyncGet('SELECT * FROM kits WHERE id = ?', [item.produto_id]);
        if (!k) return res.status(400).json({ error: `Kit ${item.produto_id} não encontrado.` });
        
        const kitProdutos = await asyncAll('SELECT * FROM kit_produtos WHERE kit_id = ?', [k.id]);
        for (const kp of kitProdutos) {
          const p = await asyncGet('SELECT * FROM produtos WHERE id = ?', [kp.produto_id]);
          if (p.estoque_atual < kp.quantidade * item.quantidade) return res.status(400).json({ error: `Estoque insuficiente de ${p.nome} para compor o Kit.` });
        }
        subtotal += k.preco_venda * item.quantidade;
        item._preco = k.preco_venda;
        item._kitProdutos = kitProdutos;
      } else {
        const p = await asyncGet('SELECT * FROM produtos WHERE id = ?', [item.produto_id]);
        if (!p) return res.status(400).json({ error: `Produto ${item.produto_id} não encontrado.` });
        if (p.estoque_atual < item.quantidade) return res.status(400).json({ error: `Estoque insuficiente para ${p.nome}.` });
        subtotal += p.preco_venda * item.quantidade;
        item._preco = p.preco_venda;
      }
    }

    let descontoPontos = 0;
    if (cliente_id && pontos_usados) {
      descontoPontos = pontos_usados * 0.05; // 100 pontos = R$ 5
      await asyncRun('UPDATE clientes SET pontos = pontos - ? WHERE id = ?', [pontos_usados, cliente_id]);
    }

    const valorFrete = parseFloat(taxa_entrega) || 0;
    const totalFinal = Math.max(0, subtotal - (desconto || 0) - descontoPontos) + valorFrete;
    const data = new Date().toISOString();
    
    let vendaRes;
    try {
      vendaRes = await asyncRun('INSERT INTO vendas (data, loja_id, usuario_id, total, forma_pagamento, desconto, campanha_id, taxa_entrega) VALUES (?,?,?,?,?,?,?,?)',
        [data, loja_id, usuario_id, totalFinal, forma_pagamento, desconto || 0, campanha_id || null, valorFrete]);
    } catch(e) {
      vendaRes = await asyncRun('INSERT INTO vendas (data, loja_id, usuario_id, total, forma_pagamento, taxa_entrega) VALUES (?,?,?,?,?,?)',
        [data, loja_id, usuario_id, totalFinal, forma_pagamento, valorFrete]);
    }
    const venda_id = vendaRes.id;

    for (const item of itens) {
      if (item.is_kit) {
        await asyncRun('INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, is_kit) VALUES (?,?,?,?,1)',
          [venda_id, item.produto_id, item.quantidade, item._preco]);
        for (const kp of item._kitProdutos) {
          const qty = kp.quantidade * item.quantidade;
          await asyncRun('UPDATE produtos SET estoque_atual = estoque_atual - ? WHERE id = ?', [qty, kp.produto_id]);
          await asyncRun('INSERT INTO estoque_mov (produto_id, tipo, quantidade, data, usuario_id, observacao) VALUES (?,?,?,?,?,?)',
            [kp.produto_id, 'saida', qty, data, usuario_id, `Venda Kit #${venda_id}`]);
        }
      } else {
        await asyncRun('INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario, is_kit) VALUES (?,?,?,?,0)',
          [venda_id, item.produto_id, item.quantidade, item._preco]);
        await asyncRun('UPDATE produtos SET estoque_atual = estoque_atual - ? WHERE id = ?', [item.quantidade, item.produto_id]);
        await asyncRun('INSERT INTO estoque_mov (produto_id, tipo, quantidade, data, usuario_id, observacao) VALUES (?,?,?,?,?,?)',
          [item.produto_id, 'saida', item.quantidade, data, usuario_id, `Venda #${venda_id}`]);
      }
    }

    // Fidelidade: Ganhar pontos (somente sobre produtos, não frete)
    if (cliente_id) {
      const pontosGanhos = Math.floor(totalFinal - valorFrete); // 1 ponto por real
      await asyncRun('UPDATE clientes SET pontos = pontos + ? WHERE id = ?', [pontosGanhos, cliente_id]);
    }

    // Rotas e Entregas
    if (is_delivery) {
      await asyncRun('INSERT INTO entregas (venda_id, entregador_id, endereco, status, data_criacao, data_atualizacao) VALUES (?, NULL, ?, ?, ?, ?)',
        [venda_id, endereco_entrega || 'Endereço não informado', 'aguardando', data, data]);
    }

    // Simulação Mensageria Automática
    if (cliente_id) {
      console.log(`[Mensageria Simulação] Comprovante NFC-e Venda #${venda_id} enviado para Cliente #${cliente_id} via WhatsApp.`);
    }

    // Comissão simples de 5% para o vendedor (sobre valor produtos)
    const idVendedorComissao = vendedor_id || usuario_id;
    if (idVendedorComissao) {
      await asyncRun('INSERT INTO comissoes (venda_id, usuario_id, valor) VALUES (?,?,?)',
        [venda_id, idVendedorComissao, totalFinal * 0.05]);
    }

    res.status(201).json({ id: venda_id, total: totalFinal });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ──────────────────────────────────────────────────────────────
// ROTAS: Clientes
// ──────────────────────────────────────────────────────────────
app.get('/api/clientes', async (req, res) => {
  try {
    const { q } = req.query;
    let sql = 'SELECT * FROM clientes';
    const params = [];
    if (q) { sql += ' WHERE nome LIKE ? OR cpf_cnpj LIKE ? OR email LIKE ?'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    sql += ' ORDER BY nome';
    res.json(await asyncAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clientes', async (req, res) => {
  try {
    const { nome, cpf_cnpj, email, telefone } = req.body;
    const r = await asyncRun('INSERT INTO clientes (nome, cpf_cnpj, email, telefone, pontos) VALUES (?,?,?,?,0)',
      [nome, cpf_cnpj, email, telefone]);
    res.status(201).json({ id: r.id, nome });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ──────────────────────────────────────────────────────────────
// ROTAS: Kits e Combos
// ──────────────────────────────────────────────────────────────
app.get('/api/kits', async (req, res) => {
  try {
    const kits = await asyncAll("SELECT * FROM kits WHERE ativo = 1 ORDER BY nome");
    for (let k of kits) {
      k.produtos = await asyncAll("SELECT kp.*, p.nome FROM kit_produtos kp JOIN produtos p ON kp.produto_id = p.id WHERE kp.kit_id = ?", [k.id]);
    }
    res.json(kits);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/kits', async (req, res) => {
  try {
    const { sku, nome, preco_venda, produtos } = req.body; // produtos: [{produto_id, quantidade}]
    const r = await asyncRun('INSERT INTO kits (sku, nome, preco_venda) VALUES (?,?,?)', [sku, nome, preco_venda]);
    const kit_id = r.id;
    for (let p of produtos) {
      await asyncRun('INSERT INTO kit_produtos (kit_id, produto_id, quantidade) VALUES (?,?,?)', [kit_id, p.produto_id, p.quantidade]);
    }
    res.status(201).json({ id: kit_id, sku, nome });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ──────────────────────────────────────────────────────────────
// ROTAS: Entregas e Mensageria (Fase 3)
// ──────────────────────────────────────────────────────────────
app.get('/api/entregadores', async (req, res) => {
  try { res.json(await asyncAll("SELECT * FROM entregadores ORDER BY nome")); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/entregadores', async (req, res) => {
  try {
    const { nome, veiculo, placa, telefone } = req.body;
    const r = await asyncRun('INSERT INTO entregadores (nome, veiculo, placa, telefone) VALUES (?,?,?,?)', [nome, veiculo, placa, telefone]);
    res.status(201).json({ id: r.id, nome });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/entregas', async (req, res) => {
  try {
    const entregas = await asyncAll(`
      SELECT e.*, v.total, c.nome AS cliente_nome, ent.nome AS entregador_nome
      FROM entregas e
      JOIN vendas v ON e.venda_id = v.id
      LEFT JOIN clientes c ON c.id = (SELECT cliente_id FROM vendas LIMIT 1) -- Simplicidade: ligando por logica
      LEFT JOIN entregadores ent ON e.entregador_id = ent.id
      ORDER BY e.data_criacao DESC LIMIT 100
    `);
    res.json(entregas);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/entregas/:id/status', async (req, res) => {
  try {
    const { status, entregador_id } = req.body;
    let sql = 'UPDATE entregas SET status = ?, data_atualizacao = ?';
    let params = [status, new Date().toISOString()];
    if (entregador_id !== undefined) { sql += ', entregador_id = ?'; params.push(entregador_id); }
    sql += ' WHERE id = ?'; params.push(req.params.id);
    await asyncRun(sql, params);
    
    if (status === 'em_rota') console.log(`[Mensageria] SMS: "Seu pedido #${req.params.id} saiu para entrega!"`);
    
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/mensageria/disparo', async (req, res) => {
  try {
    const { publico, canal, mensagem } = req.body;
    let alvoCount = 0;
    const clientes = await asyncAll('SELECT * FROM clientes');
    
    if (publico === 'todos') alvoCount = clientes.length;
    else if (publico === 'ouro') alvoCount = clientes.filter(c => c.pontos >= 1000).length;
    else alvoCount = Math.floor(clientes.length / 2); // mockup

    // Simula o tempo de envio
    console.log(`[Mensageria] Disparando "${mensagem.substring(0, 30)}..." via ${canal} para ${alvoCount} clientes (${publico}).`);
    
    res.json({ success: true, count: alvoCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ──────────────────────────────────────────────────────────────
// ROTAS: Vendedores e Comissões
// ──────────────────────────────────────────────────────────────
app.get('/api/vendedores', async (req, res) => {
  try { res.json(await asyncAll("SELECT id, nome, email FROM usuarios WHERE role IN ('vendedor', 'superadmin', 'gestor') ORDER BY nome")); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/vendedores', async (req, res) => {
  try {
    const { nome, email, senha, loja_id } = req.body;
    const r = await asyncRun('INSERT INTO usuarios (nome, email, senha_hash, role, loja_id) VALUES (?,?,?,?,?)',
      [nome, email, senha, 'vendedor', loja_id || 1]);
    res.status(201).json({ id: r.id, nome });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/comissoes', async (req, res) => {
  try {
    const data = await asyncAll(`
      SELECT u.nome AS vendedor, COUNT(c.id) AS total_vendas, SUM(c.valor) AS total_comissao, SUM(v.total) as total_vendido
      FROM comissoes c
      JOIN usuarios u ON c.usuario_id = u.id
      JOIN vendas v ON c.venda_id = v.id
      GROUP BY u.id ORDER BY total_comissao DESC`);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ──────────────────────────────────────────────────────────────
// ROTAS: Campanhas
// ──────────────────────────────────────────────────────────────
app.get('/api/campanhas', async (req, res) => {
  try { res.json(await asyncAll("SELECT * FROM campanhas ORDER BY nome")); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/campanhas', async (req, res) => {
  try {
    const { nome, codigo_cupom, tipo_desconto, valor_desconto } = req.body;
    const codigoFormatado = codigo_cupom.trim().toUpperCase();
    const r = await asyncRun('INSERT INTO campanhas (nome, codigo_cupom, tipo_desconto, valor_desconto, ativo) VALUES (?,?,?,?,1)',
      [nome, codigoFormatado, tipo_desconto, valor_desconto]);
    res.status(201).json({ id: r.id, nome });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/campanhas/:id/status', async (req, res) => {
  try {
    const { ativo } = req.body;
    await asyncRun('UPDATE campanhas SET ativo = ? WHERE id = ?', [ativo, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/campanhas/validar/:codigo', async (req, res) => {
  try {
    const codigo = req.params.codigo.trim().toUpperCase();
    const camp = await asyncGet('SELECT * FROM campanhas WHERE codigo_cupom = ? AND ativo = 1', [codigo]);
    if (!camp) return res.status(404).json({ error: 'Cupom inválido ou inativo.' });
    res.json(camp);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ──────────────────────────────────────────────────────────────
// ROTAS: Financeiro / Despesas
// ──────────────────────────────────────────────────────────────
app.get('/api/despesas', async (req, res) => {
  try { res.json(await asyncAll("SELECT * FROM despesas ORDER BY data DESC LIMIT 200")); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/despesas', async (req, res) => {
  try {
    const { descricao, valor, categoria, loja_id } = req.body;
    const r = await asyncRun('INSERT INTO despesas (descricao, valor, data, categoria, loja_id) VALUES (?,?,?,?,?)',
      [descricao, parseFloat(valor), new Date().toISOString(), categoria || 'Outros', loja_id || 1]);
    res.status(201).json({ id: r.id, descricao });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/despesas/:id', async (req, res) => {
  try {
    await asyncRun('DELETE FROM despesas WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/financeiro/fluxo-caixa', async (req, res) => {
  try {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
    const receitasResult = await asyncGet("SELECT COALESCE(SUM(total), 0) AS total FROM vendas WHERE data >= ?", [inicioMes]);
    const despesasResult = await asyncGet("SELECT COALESCE(SUM(valor), 0) AS total FROM despesas WHERE data >= ?", [inicioMes]);
    res.json({ receitas: receitasResult.total, despesas: despesasResult.total, saldo: receitasResult.total - despesasResult.total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ──────────────────────────────────────────────────────────────
// ROTAS: Dashboard
// ──────────────────────────────────────────────────────────────
app.get('/api/dashboard', async (req, res) => {
  try {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();

    const [totalMes, totalDia, qtdVendas, totalClientes, totalProdutos, estoqueMin, topProdutos] = await Promise.all([
      asyncGet(`SELECT COALESCE(SUM(total), 0) AS valor FROM vendas WHERE data >= ?`, [inicioMes]),
      asyncGet(`SELECT COALESCE(SUM(total), 0) AS valor FROM vendas WHERE date(data) = date('now', 'localtime')`),
      asyncGet(`SELECT COUNT(*) AS qtd FROM vendas WHERE data >= ?`, [inicioMes]),
      asyncGet(`SELECT COUNT(*) AS qtd FROM clientes`),
      asyncGet(`SELECT COUNT(*) AS qtd FROM produtos WHERE ativo = 1`),
      asyncAll(`SELECT nome, estoque_atual FROM produtos WHERE estoque_atual <= 5 AND ativo = 1 ORDER BY estoque_atual`),
      asyncAll(`SELECT p.nome, SUM(iv.quantidade) AS total_vendido
                FROM itens_venda iv JOIN produtos p ON iv.produto_id = p.id
                GROUP BY p.id ORDER BY total_vendido DESC LIMIT 5`),
    ]);

    res.json({ totalMes: totalMes.valor, totalDia: totalDia.valor, qtdVendas: qtdVendas.qtd,
      totalClientes: totalClientes.qtd, totalProdutos: totalProdutos.qtd, estoqueMin, topProdutos });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ──────────────────────────────────────────────────────────────
// Iniciar servidor
// ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Sistema de Varejo rodando em http://localhost:${PORT}\n`);
});
