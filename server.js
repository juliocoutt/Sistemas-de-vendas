/**
 * ==================================================================================
 *                       MANUAL DE ARQUITETURA E ESTRUTURA DO VAREJOOS
 * ==================================================================================
 * Este arquivo (server.js) representa o CORE do BACKEND da aplicação. Ele é
 * responsável por gerenciar a comunicação com o Banco de Dados PostgreSQL (Supabase)
 * e expor as APIs (rotas) consumidas pela interface do usuário (Frontend).
 * 
 * ----------------------------------------------------------------------------------
 * 📐 ARQUITETURA GERAL DO SISTEMA:
 * ----------------------------------------------------------------------------------
 * O sistema segue o modelo cliente-servidor tradicional, altamente otimizado:
 * 
 *     [Navegador Web]  <=========>  [API REST (server.js)]  <=========>  [Banco de Dados]
 *      HTML5 / CSS3                      Node.js / Express               Supabase (PostgreSQL)
 *    (public/admin.html)                 (Serviço Web)                   (Tabelas Relacionais)
 * 
 * ----------------------------------------------------------------------------------
 * 📦 ESTRUTURA DE MÓDULOS E FUNCIONALIDADES:
 * ----------------------------------------------------------------------------------
 * Para facilitar a manutenção e evolução do código, este arquivo está dividido em:
 * 
 *   1. 🚪 SEGURANÇA & AUTH: Rotas de login e gerenciamento de perfil (/api/login).
 *   2. 🏬 LOJAS & CONFIGS: Cadastro de unidades e logo do sistema (/api/lojas).
 *   3. 📦 PRODUTOS & ESTOQUE: Cadastro de itens, variações, custo médio e controle
 *      de estoque (entradas, saídas, ajustes manuais e relatórios).
 *   4. 👥 CLIENTES & PONTOS: Cadastro de clientes, controle de pontuação e carteiras.
 *   5. 🏪 VENDAS & PDV: Lançamento de vendas integrado com estoque, comissões,
 *      controle de descontos e entrega (delivery).
 *   6. 💸 FINANCEIRO (Contas Pagar/Receber e DRE): Lançamento de receitas/despesas
 *      e geração automática do demonstrativo contábil (DRE).
 *   7. 🧑‍💼 COMISSÕES & VENDEDORES: Relatório consolidado e taxas de comissões.
 *   8. 👥 CRM INTELIGENTE & AUTOMAÇÃO:
 *      - Aba 1: Visão 360° do Cliente (LTV, preferências de produtos e timeline).
 *      - Aba 2: Kanban Comercial (Pipe de oportunidades de vendas).
 *      - Aba 3: Pós-Venda (SAC Tickets com SLA e Logística Reversa de devoluções).
 *      - Aba 4: Régua de Automações (WhatsApp de cobrança e campanhas de Upsell).
 *   9. 🤖 CHATBOT DE SUPORTE: Assistente de IA para responder dúvidas do sistema.
 * 
 * ==================================================================================
 */

const express = require('express'); // Framework web para criar as rotas da API
const path = require('path');       // Utilitário para caminhos de arquivos
const fs = require('fs');           // Módulo do Node para manipular arquivos do sistema (Ler migrações)
require('dotenv').config();         // Carrega as variáveis de ambiente locais do arquivo .env
const { Pool } = require('pg');     // Driver de conexão oficial com o PostgreSQL do Supabase

const app = express();
const PORT = process.env.PORT || 3001; // Porta em que o servidor irá rodar

// Configuração da conexão com o Banco de Dados do Supabase utilizando SSL para segurança
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

pool.connect()
  .then(async () => {
    console.log('✅ Conectado ao PostgreSQL');
    try {
      const sqlPath = path.join(__dirname, 'db', 'migrations_financeiro.sql');
      if (fs.existsSync(sqlPath)) {
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await pool.query(sql);
        console.log('✅ Migrações financeiras aplicadas com sucesso!');
      }
    } catch (migErr) {
      console.error('⚠️ Erro ao aplicar migrações financeiras:', migErr.message);
    }
  })
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
    res.json({ id: user.id, nome: user.nome, email: user.email, role: user.role, loja_id: user.loja_id, permissoes: user.permissoes, foto: user.foto, telefone: user.telefone });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Perfil do Usuário ──
app.get('/api/usuarios/perfil/:id', async (req, res) => {
  try {
    const user = await asyncGet('SELECT id, nome, email, role, foto, telefone, permissoes FROM usuarios WHERE id = $1', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/usuarios/perfil', async (req, res) => {
  try {
    const { id, senha, foto, telefone } = req.body;
    if (!id) return res.status(400).json({ error: 'ID do usuário obrigatório.' });
    
    let sql = 'UPDATE usuarios SET ';
    const params = [];
    let i = 1;
    const sets = [];
    
    if (senha) { sets.push(`senha_hash = $${i++}`); params.push(senha); }
    if (foto !== undefined) { sets.push(`foto = $${i++}`); params.push(foto); }
    if (telefone !== undefined) { sets.push(`telefone = $${i++}`); params.push(telefone); }
    
    if (sets.length === 0) return res.json({ ok: true });
    
    sql += sets.join(', ') + ` WHERE id = $${i}`;
    params.push(id);
    
    await asyncRun(sql, params);
    res.json({ ok: true });
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
    const { sku, nome, descricao, categoria, preco_venda, custo, estoque_atual = 0, imagem, variacoes } = req.body;
    const r = await asyncRun(
      'INSERT INTO produtos (sku, nome, descricao, categoria, preco_venda, custo, estoque_atual, ativo, imagem, variacoes) VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8,$9) RETURNING id',
      [sku, nome, descricao, categoria, preco_venda, custo, estoque_atual, imagem || null, variacoes ? JSON.stringify(variacoes) : '[]']);
    res.status(201).json({ id: r.id, sku, nome });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/produtos/:id', async (req, res) => {
  try {
    const { nome, descricao, categoria, preco_venda, custo, ativo, imagem, variacoes } = req.body;
    await asyncRun(
      'UPDATE produtos SET nome=$1, descricao=$2, categoria=$3, preco_venda=$4, custo=$5, ativo=$6, imagem=$7, variacoes=$8 WHERE id=$9',
      [nome, descricao, categoria, preco_venda, custo, ativo, imagem || null, variacoes ? JSON.stringify(variacoes) : '[]', req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/produtos/bulk', async (req, res) => {
  try {
    const produtos = req.body;
    if (!Array.isArray(produtos)) return res.status(400).json({ error: 'Array esperado' });
    let count = 0;
    for (const p of produtos) {
      await asyncRun(
        'INSERT INTO produtos (sku, nome, descricao, categoria, preco_venda, custo, estoque_atual, ativo, imagem, variacoes) VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8,$9)',
        [p.sku || '', p.nome, p.descricao || '', p.categoria || 'Geral', p.preco_venda || 0, p.custo || 0, p.estoque_atual || 0, p.imagem || null, p.variacoes ? JSON.stringify(p.variacoes) : '[]']
      );
      count++;
    }
    res.json({ ok: true, inseridos: count });
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
    const { loja_id, usuario_id, vendedor_id, forma_pagamento, itens, desconto, campanha_id, cliente_id, pontos_usados, is_delivery, endereco_entrega, taxa_entrega, caixa_id, pagamentos } = req.body;
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
      'INSERT INTO vendas (data, loja_id, usuario_id, caixa_id, cliente_id, total, forma_pagamento, pagamentos, desconto, campanha_id, taxa_entrega) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id',
      [data, loja_id, usuario_id, caixa_id || null, cliente_id || null, totalFinal, forma_pagamento, pagamentos ? JSON.stringify(pagamentos) : null, desconto || 0, campanha_id || null, valorFrete]);
    const venda_id = vendaRes.id;

    if (caixa_id) {
      await asyncRun('UPDATE caixas SET total_vendas = total_vendas + $1 WHERE id = $2', [totalFinal, caixa_id]);
    }

    if (['fiado', 'crediario', 'prazo'].includes((forma_pagamento || '').toLowerCase()) && cliente_id) {
      const dataVenc = new Date();
      dataVenc.setDate(dataVenc.getDate() + 30);
      await asyncRun(
        'INSERT INTO contas_receber (descricao, cliente_id, valor, data_vencimento, status, venda_id, loja_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [`Venda a prazo #${venda_id}`, cliente_id, totalFinal, dataVenc.toISOString().split('T')[0], 'pendente', venda_id, loja_id]
      );
      await asyncRun('UPDATE clientes SET credito_usado = credito_usado + $1 WHERE id = $2', [totalFinal, cliente_id]);
    }

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

app.put('/api/clientes/:id', async (req, res) => {
  try {
    const { nome, cpf_cnpj, email, telefone, endereco, limite_credito, credito_usado, data_nascimento, segmento, saldo_carteira } = req.body;
    await asyncRun(`
      UPDATE clientes SET 
        nome = $1, cpf_cnpj = $2, email = $3, telefone = $4, endereco = $5,
        limite_credito = $6, credito_usado = $7, data_nascimento = $8, segmento = $9, saldo_carteira = $10
      WHERE id = $11
    `, [nome, cpf_cnpj, email, telefone, endereco || null, parseFloat(limite_credito) || 0, parseFloat(credito_usado) || 0, data_nascimento || null, segmento || null, parseFloat(saldo_carteira) || 0, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clientes/bulk', async (req, res) => {
  try {
    const clientes = req.body;
    if (!Array.isArray(clientes)) return res.status(400).json({ error: 'Array esperado' });
    let count = 0;
    for (const c of clientes) {
      await asyncRun(
        'INSERT INTO clientes (nome, cpf_cnpj, email, telefone, pontos) VALUES ($1,$2,$3,$4,0)',
        [c.nome, c.cpf_cnpj || '', c.email || '', c.telefone || '']
      );
      count++;
    }
    res.json({ ok: true, inseridos: count });
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

// Retorna colaboradores/vendedores filtrados por loja (com comissão individual)
app.get('/api/vendedores', async (req, res) => {
  try {
    const { loja_id } = req.query;
    let sql = "SELECT id, nome, email, role, taxa_comissao, permissoes, telefone FROM usuarios WHERE role IN ('vendedor', 'admin', 'gestor')";
    const params = [];
    if (loja_id) {
      sql += " AND loja_id = $1";
      params.push(Number(loja_id));
    }
    sql += " ORDER BY nome";
    res.json(await asyncAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cria novo vendedor ou administrador com cargo (role) selecionável
app.post('/api/vendedores', async (req, res) => {
  try {
    const { nome, email, senha, role, loja_id, permissoes, taxa_comissao, telefone } = req.body;
    const userRole = role || 'vendedor';
    const r = await asyncRun(
      'INSERT INTO usuarios (nome, email, senha_hash, role, loja_id, permissoes, taxa_comissao, telefone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
      [nome, email, senha, userRole, loja_id || 1, permissoes ? JSON.stringify(permissoes) : '{}', taxa_comissao ?? 5.00, telefone || null]);
    res.status(201).json({ id: r.id, nome });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Atualiza dados, permissões, cargo e comissão do vendedor/gerente
app.put('/api/vendedores/:id', async (req, res) => {
  try {
    const { nome, email, role, permissoes, taxa_comissao, telefone } = req.body;
    await asyncRun('UPDATE usuarios SET nome=$1, email=$2, role=$3, permissoes=$4, taxa_comissao=$5, telefone=$6 WHERE id=$7',
      [nome, email, role || 'vendedor', permissoes ? JSON.stringify(permissoes) : '{}', taxa_comissao ?? 5.00, telefone || null, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Importação em massa de estoque via planilha (SKU + nova quantidade ou ajuste)
app.post('/api/estoque/bulk', async (req, res) => {
  try {
    const itens = req.body; // Array de { sku, quantidade_nova, usuario_id, observacao }
    if (!Array.isArray(itens)) return res.status(400).json({ error: 'Array esperado' });
    let atualizados = 0;
    for (const item of itens) {
      const p = await asyncGet('SELECT id, estoque_atual FROM produtos WHERE sku = $1', [item.sku]);
      if (!p) continue; // SKU não encontrado: pula
      const diff = item.quantidade_nova - p.estoque_atual;
      await asyncRun('UPDATE produtos SET estoque_atual = $1 WHERE id = $2', [item.quantidade_nova, p.id]);
      await asyncRun(
        'INSERT INTO estoque_mov (produto_id, tipo, quantidade, data, usuario_id, observacao) VALUES ($1,$2,$3,$4,$5,$6)',
        [p.id, 'ajuste', diff, new Date().toISOString(), item.usuario_id || null, item.observacao || 'Importação via planilha']
      );
      atualizados++;
    }
    res.json({ ok: true, atualizados });
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
    const { loja_id } = req.query;
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    
    let sqlRec = 'SELECT COALESCE(SUM(total), 0) AS total FROM vendas WHERE data >= $1';
    let sqlDes = 'SELECT COALESCE(SUM(valor), 0) AS total FROM despesas WHERE data >= $1';
    const params = [inicioMes];
    if (loja_id) {
      sqlRec += ' AND loja_id = $2';
      sqlDes += ' AND loja_id = $2';
      params.push(Number(loja_id));
    }
    
    const receitas = await asyncGet(sqlRec, params);
    const despesas = await asyncGet(sqlDes, params);
    res.json({ receitas: receitas.total, despesas: despesas.total, saldo: receitas.total - despesas.total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Dashboard Principal de Loja (Filtrável por loja_id) ──
app.get('/api/dashboard', async (req, res) => {
  try {
    const { loja_id } = req.query;
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const hoje = new Date().toISOString().split('T')[0];
    
    let sqlMes = 'SELECT COALESCE(SUM(total), 0) AS valor FROM vendas WHERE data >= $1';
    let sqlDia = 'SELECT COALESCE(SUM(total), 0) AS valor FROM vendas WHERE data::date = $1';
    let sqlQtd = 'SELECT COUNT(*) AS qtd FROM vendas WHERE data >= $1';
    let sqlCli = 'SELECT COUNT(*) AS qtd FROM clientes';
    let sqlProd = 'SELECT COUNT(*) AS qtd FROM produtos WHERE ativo = 1';
    let sqlEst = 'SELECT nome, estoque_atual FROM produtos WHERE estoque_atual <= 5 AND ativo = 1 ORDER BY estoque_atual';
    let sqlTop = 'SELECT p.nome, SUM(iv.quantidade) AS total_vendido FROM itens_venda iv JOIN produtos p ON iv.produto_id = p.id JOIN vendas v ON iv.venda_id = v.id';
    
    const paramsMes = [inicioMes];
    const paramsDia = [hoje];
    const paramsTop = [];
    
    if (loja_id) {
      sqlMes += ' AND loja_id = $2';
      paramsMes.push(Number(loja_id));
      
      sqlDia += ' AND loja_id = $2';
      paramsDia.push(Number(loja_id));
      
      sqlQtd += ' AND loja_id = $2';
      
      sqlTop += ' WHERE v.loja_id = $1';
      paramsTop.push(Number(loja_id));
    }
    
    sqlTop += ' GROUP BY p.id, p.nome ORDER BY total_vendido DESC LIMIT 5';
    
    const [totalMes, totalDia, qtdVendas, totalClientes, totalProdutos, estoqueMin, topProdutos] = await Promise.all([
      asyncGet(sqlMes, paramsMes),
      asyncGet(sqlDia, paramsDia),
      asyncGet(sqlQtd, [inicioMes, ...(loja_id ? [Number(loja_id)] : [])]),
      asyncGet(sqlCli),
      asyncGet(sqlProd),
      asyncAll(sqlEst),
      asyncAll(sqlTop, paramsTop),
    ]);
    
    res.json({ 
      totalMes: totalMes.valor, 
      totalDia: totalDia.valor, 
      qtdVendas: qtdVendas.qtd,
      totalClientes: totalClientes.qtd, 
      totalProdutos: totalProdutos.qtd, 
      estoqueMin, 
      topProdutos 
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── 👑 PAINEL MASTER (Somente Superadmin) ──

// Dashboard consolidado para o Dono do Sistema
app.get('/api/master/dashboard', async (req, res) => {
  try {
    const [lojas, usuarios, vendas, faturamento] = await Promise.all([
      asyncGet('SELECT COUNT(*) AS count FROM lojas'),
      asyncGet('SELECT COUNT(*) AS count FROM usuarios'),
      asyncGet('SELECT COUNT(*) AS count FROM vendas'),
      asyncGet('SELECT COALESCE(SUM(total), 0) AS valor FROM vendas')
    ]);
    res.json({
      totalLojas: lojas.count,
      totalUsuarios: usuarios.count,
      totalVendas: vendas.count,
      totalFaturamento: faturamento.valor
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Retorna todos os usuários cadastrados no ecossistema (Master View)
app.get('/api/usuarios/master', async (req, res) => {
  try {
    res.json(await asyncAll(`
      SELECT u.id, u.nome, u.email, u.role, u.telefone, u.loja_id, l.nome as loja_nome 
      FROM usuarios u 
      LEFT JOIN lojas l ON u.loja_id = l.id 
      ORDER BY l.nome, u.nome
    `));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Criação integrada de Novo Cliente (Loja + Administrador Principal da Loja)
app.post('/api/master/clientes', async (req, res) => {
  try {
    const { loja_nome, cnpj, endereco, telefone, email, admin_nome, admin_email, admin_senha } = req.body;
    
    // 1. Insere a loja
    const storeRes = await asyncRun(
      'INSERT INTO lojas (nome, cnpj, endereco, telefone, email) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [loja_nome, cnpj || null, endereco || null, telefone || null, email || null]
    );
    const loja_id = storeRes.id;
    
    // 2. Insere o administrador inicial dessa loja
    const permissoesPadrao = {
      dashboard: { ler: true, escrever: true, excluir: true },
      financeiro: { ler: true, escrever: true, excluir: true },
      pdv: { ler: true, escrever: true, excluir: true },
      vendas: { ler: true, escrever: true, excluir: true },
      produtos: { ler: true, escrever: true, excluir: true },
      estoque: { ler: true, escrever: true, excluir: true },
      clientes: { ler: true, escrever: true, excluir: true },
      entregas: { ler: true, escrever: true, excluir: true }
    };
    
    await asyncRun(
      'INSERT INTO usuarios (nome, email, senha_hash, role, loja_id, permissoes) VALUES ($1, $2, $3, $4, $5, $6)',
      [admin_nome, admin_email, admin_senha, 'admin', loja_id, JSON.stringify(permissoesPadrao)]
    );
    
    res.status(201).json({ success: true, loja_id, loja_nome });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Edição de Loja (Master)
app.put('/api/lojas/:id', async (req, res) => {
  try {
    const { nome, cnpj, endereco, telefone, email } = req.body;
    await asyncRun(
      'UPDATE lojas SET nome=$1, cnpj=$2, endereco=$3, telefone=$4, email=$5 WHERE id=$6',
      [nome, cnpj, endereco, telefone, email, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Exclusão de Loja (Master)
app.delete('/api/lojas/:id', async (req, res) => {
  try {
    await asyncRun('DELETE FROM lojas WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Configurações Dinâmicas (Logo & Banner) ──
app.get('/api/configuracoes', async (req, res) => {
  try {
    const rows = await asyncAll('SELECT chave, valor FROM configuracoes');
    const config = {};
    rows.forEach(r => { config[r.chave] = r.valor; });
    res.json(config);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/configuracoes', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'];
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Apenas Administradores podem alterar as configurações do sistema.' });
    }
    const { logo_sistema, banner_login } = req.body;
    if (logo_sistema !== undefined) {
      await asyncRun('INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO UPDATE SET valor = $2', ['logo_sistema', logo_sistema]);
    }
    if (banner_login !== undefined) {
      await asyncRun('INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO UPDATE SET valor = $2', ['banner_login', banner_login]);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Ecossistema Financeiro ──
app.post('/api/auth/validate-manager', async (req, res) => {
  try {
    const { email, senha } = req.body;
    const user = await asyncGet("SELECT * FROM usuarios WHERE email = $1 AND senha_hash = $2 AND role IN ('admin', 'superadmin', 'gestor')", [email, senha]);
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas ou usuário sem permissão de gestor.' });
    res.json({ ok: true, gestor_id: user.id, nome: user.nome });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/caixas', async (req, res) => {
  try {
    const { status, loja_id } = req.query;
    let sql = 'SELECT c.*, u.nome as usuario_nome FROM caixas c JOIN usuarios u ON c.usuario_id = u.id WHERE 1=1';
    const params = [];
    let i = 1;
    if (status) { sql += ` AND c.status = $${i++}`; params.push(status); }
    if (loja_id) { sql += ` AND c.loja_id = $${i++}`; params.push(loja_id); }
    sql += ' ORDER BY c.data_abertura DESC';
    res.json(await asyncAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/caixas', async (req, res) => {
  try {
    const { loja_id, usuario_id, suprimento } = req.body;
    const aberto = await asyncGet('SELECT id FROM caixas WHERE usuario_id = $1 AND status = $2', [usuario_id, 'aberto']);
    if (aberto) return res.status(400).json({ error: 'Usuário já possui um caixa aberto.' });
    const r = await asyncRun('INSERT INTO caixas (loja_id, usuario_id, data_abertura, suprimento, status) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [loja_id, usuario_id, new Date().toISOString(), suprimento || 0, 'aberto']);
    res.status(201).json({ id: r.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/caixas/:id/sangria', async (req, res) => {
  try {
    const { usuario_id, valor, motivo } = req.body;
    const caixa = await asyncGet('SELECT id FROM caixas WHERE id = $1 AND status = $2', [req.params.id, 'aberto']);
    if (!caixa) return res.status(400).json({ error: 'Caixa não encontrado ou já fechado.' });
    await asyncRun('INSERT INTO sangrias (caixa_id, usuario_id, valor, motivo) VALUES ($1,$2,$3,$4)', [req.params.id, usuario_id, valor, motivo]);
    await asyncRun('UPDATE caixas SET total_sangrias = total_sangrias + $1 WHERE id = $2', [valor, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/caixas/:id/fechar', async (req, res) => {
  try {
    const { saldo_informado, observacao } = req.body;
    const c = await asyncGet('SELECT * FROM caixas WHERE id = $1 AND status = $2', [req.params.id, 'aberto']);
    if (!c) return res.status(400).json({ error: 'Caixa não encontrado ou já fechado.' });
    const saldo_esperado = parseFloat(c.suprimento) + parseFloat(c.total_vendas) - parseFloat(c.total_sangrias);
    const quebra = parseFloat(saldo_informado) - saldo_esperado;
    await asyncRun('UPDATE caixas SET data_fechamento = $1, saldo_esperado = $2, saldo_informado = $3, quebra = $4, status = $5, observacao = $6 WHERE id = $7',
      [new Date().toISOString(), saldo_esperado, saldo_informado, quebra, 'fechado', observacao, req.params.id]);
    res.json({ ok: true, saldo_esperado, quebra });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/notas-entrada', async (req, res) => {
  try { res.json(await asyncAll('SELECT ne.*, u.nome as usuario_nome FROM notas_entrada ne LEFT JOIN usuarios u ON ne.usuario_id = u.id ORDER BY ne.data_entrada DESC')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/notas-entrada', async (req, res) => {
  try {
    const { numero_nf, fornecedor, data_emissao, valor_total, usuario_id, itens, observacao, loja_id } = req.body;
    const r = await asyncRun('INSERT INTO notas_entrada (numero_nf, fornecedor, data_emissao, valor_total, usuario_id, observacao) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [numero_nf, fornecedor, data_emissao, valor_total, usuario_id, observacao]);
    
    for (const item of itens) {
      await asyncRun('INSERT INTO itens_nota_entrada (nota_id, produto_id, quantidade, custo_unitario) VALUES ($1,$2,$3,$4)',
        [r.id, item.produto_id, item.quantidade, item.custo_unitario]);
      // Atualiza estoque e custo médio
      const p = await asyncGet('SELECT estoque_atual, custo_medio FROM produtos WHERE id = $1', [item.produto_id]);
      const estoque_atual = p ? parseInt(p.estoque_atual) : 0;
      const custo_medio_atual = p && p.custo_medio ? parseFloat(p.custo_medio) : 0;
      const novo_estoque = estoque_atual + item.quantidade;
      const novo_custo_medio = ((estoque_atual * custo_medio_atual) + (item.quantidade * item.custo_unitario)) / novo_estoque;
      
      await asyncRun('UPDATE produtos SET estoque_atual = $1, custo_medio = $2, custo = $3 WHERE id = $4',
        [novo_estoque, novo_custo_medio, item.custo_unitario, item.produto_id]);
      await asyncRun('INSERT INTO estoque_mov (produto_id, tipo, quantidade, data, usuario_id, observacao) VALUES ($1,$2,$3,$4,$5,$6)',
        [item.produto_id, 'entrada', item.quantidade, new Date().toISOString(), usuario_id, `NF ${numero_nf}`]);
    }
    
    // Gerar conta a pagar para 30 dias (simplificado)
    const dataVenc = new Date();
    dataVenc.setDate(dataVenc.getDate() + 30);
    await asyncRun('INSERT INTO contas_pagar (descricao, fornecedor, valor, data_vencimento, status, nota_entrada_id, loja_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [`Ref. NF ${numero_nf}`, fornecedor, valor_total, dataVenc.toISOString().split('T')[0], 'pendente', r.id, loja_id || 1]);

    res.status(201).json({ id: r.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/contas-pagar', async (req, res) => {
  try { res.json(await asyncAll("SELECT * FROM contas_pagar ORDER BY status DESC, data_vencimento ASC")); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/contas-pagar/:id/pagar', async (req, res) => {
  try {
    await asyncRun("UPDATE contas_pagar SET status = 'pago', data_pagamento = $1 WHERE id = $2", [new Date().toISOString().split('T')[0], req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/contas-receber', async (req, res) => {
  try { res.json(await asyncAll("SELECT cr.*, c.nome as cliente_nome FROM contas_receber cr LEFT JOIN clientes c ON cr.cliente_id = c.id ORDER BY cr.status DESC, cr.data_vencimento ASC")); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/contas-receber/:id/receber', async (req, res) => {
  try {
    await asyncRun("UPDATE contas_receber SET status = 'recebido', data_recebimento = $1 WHERE id = $2", [new Date().toISOString().split('T')[0], req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/financeiro/dre', async (req, res) => {
  try {
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const receitaBruta = await asyncGet("SELECT COALESCE(SUM(total + desconto), 0) as valor FROM vendas WHERE data >= $1", [inicioMes]);
    const descontos = await asyncGet("SELECT COALESCE(SUM(desconto), 0) as valor FROM vendas WHERE data >= $1", [inicioMes]);
    const receitaLiquida = parseFloat(receitaBruta.valor) - parseFloat(descontos.valor);
    
    // CMV = soma do custo_medio * quantidade vendida
    const cmv = await asyncGet("SELECT COALESCE(SUM(iv.quantidade * p.custo_medio), 0) as valor FROM itens_venda iv JOIN vendas v ON iv.venda_id = v.id JOIN produtos p ON iv.produto_id = p.id WHERE v.data >= $1 AND p.custo_medio IS NOT NULL", [inicioMes]);
    const lucroBruto = receitaLiquida - parseFloat(cmv.valor);
    
    const despesas = await asyncGet("SELECT COALESCE(SUM(valor), 0) as valor FROM despesas WHERE data >= $1", [inicioMes]);
    const lucroLiquido = lucroBruto - parseFloat(despesas.valor);
    
    res.json({
      receitaBruta: parseFloat(receitaBruta.valor),
      descontos: parseFloat(descontos.valor),
      receitaLiquida,
      cmv: parseFloat(cmv.valor),
      lucroBruto,
      despesasOperacionais: parseFloat(despesas.valor),
      lucroLiquido
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/estoque/curva-abc', async (req, res) => {
  try {
    const produtos = await asyncAll(`
      SELECT p.id, p.nome, p.sku, 
             COALESCE(SUM(iv.quantidade), 0) as qtd_vendida,
             COALESCE(SUM(iv.quantidade * iv.preco_unitario), 0) as faturamento,
             COALESCE(SUM(iv.quantidade * (iv.preco_unitario - COALESCE(p.custo_medio, p.custo, 0))), 0) as margem_lucro
      FROM produtos p
      LEFT JOIN itens_venda iv ON p.id = iv.produto_id
      GROUP BY p.id, p.nome, p.sku
      ORDER BY margem_lucro DESC
    `);
    
    // Calcular A (top 20%), B (30%), C (50%)
    let faturamentoTotal = produtos.reduce((acc, p) => acc + parseFloat(p.faturamento), 0);
    let margemTotal = produtos.reduce((acc, p) => acc + parseFloat(p.margem_lucro), 0);
    
    let accMargem = 0;
    const curva = produtos.map(p => {
      accMargem += parseFloat(p.margem_lucro);
      const perc = margemTotal > 0 ? accMargem / margemTotal : 0;
      let classe = 'C';
      if (perc <= 0.8) classe = 'A';
      else if (perc <= 0.95) classe = 'B';
      return { ...p, classe };
    });
    
    res.json(curva);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/crm/inadimplentes', async (req, res) => {
  try {
    res.json(await asyncAll(`
      SELECT cr.*, c.nome, c.telefone, c.email,
             (CURRENT_DATE - cr.data_vencimento) AS dias_atraso
      FROM contas_receber cr 
      JOIN clientes c ON cr.cliente_id = c.id 
      WHERE cr.status = 'pendente' AND cr.data_vencimento < CURRENT_DATE
      ORDER BY cr.data_vencimento ASC
    `));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/crm/ltv', async (req, res) => {
  try {
    res.json(await asyncAll(`
      SELECT c.id, c.nome, c.telefone,
             COUNT(v.id) as total_compras,
             COALESCE(SUM(v.total), 0) as ltv_valor,
             COALESCE(SUM(v.total) / NULLIF(COUNT(v.id), 0), 0) as ticket_medio
      FROM clientes c
      LEFT JOIN vendas v ON c.id = v.cliente_id
      GROUP BY c.id, c.nome, c.telefone
      ORDER BY ltv_valor DESC
    `));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CRM: Oportunidades (Kanban) ──
app.get('/api/crm/oportunidades', async (req, res) => {
  try { res.json(await asyncAll('SELECT * FROM crm_oportunidades ORDER BY id DESC')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/crm/oportunidades', async (req, res) => {
  try {
    const { cliente_nome, valor, etapa, descricao } = req.body;
    const r = await asyncRun('INSERT INTO crm_oportunidades (cliente_nome, valor, etapa, descricao) VALUES ($1,$2,$3,$4) RETURNING id',
      [cliente_nome, parseFloat(valor) || 0, etapa || 'prospeccao', descricao || '']);
    res.status(201).json({ id: r.id, cliente_nome });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/crm/oportunidades/:id', async (req, res) => {
  try {
    const { cliente_nome, valor, etapa, descricao } = req.body;
    await asyncRun('UPDATE crm_oportunidades SET cliente_nome = $1, valor = $2, etapa = $3, descricao = $4 WHERE id = $5',
      [cliente_nome, parseFloat(valor) || 0, etapa, descricao, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/crm/oportunidades/:id', async (req, res) => {
  try {
    await asyncRun('DELETE FROM crm_oportunidades WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CRM: Tickets (Suporte / SAC) ──
app.post('/api/chatbot', (req, res) => {
  try {
    const { mensagem } = req.body;
    if (!mensagem) return res.status(400).json({ error: 'Mensagem vazia.' });

    const msg = mensagem.toLowerCase();
    let resposta = '';

    if (msg.includes('cadastrar') && msg.includes('produto')) {
      resposta = `Para cadastrar um produto, siga estes passos simples:
1. Clique no menu lateral **Produtos**.
2. Clique no botão **+ Novo Produto** no canto superior direito.
3. Insira o nome do produto, preço de venda, SKU, custo e estoque inicial.
4. Se quiser, faça upload de uma foto clicando na área de imagem.
5. Clique em **Salvar** para registrar. 

*Você também pode fazer a importação em massa via planilha de Excel utilizando o botão "Importar Planilha"!*`;
    } else if (msg.includes('desconto') || msg.includes('senha')) {
      resposta = `No **PDV (Frente de Caixa)**, os descontos funcionam assim:
- **Desconto em Cupom:** Você pode selecionar ou aplicar cupons de campanhas promocionais ativas para dar descontos percentuais ou fixos.
- **Desconto Manual:** Ao aplicar um desconto manual no valor final do carrinho, o sistema abrirá um modal de segurança **solicitando a senha do gerente/administrador** para validação do desconto. Isso garante o controle rígido das margens de lucro!`;
    } else if (msg.includes('devol') || msg.includes('reembolso') || msg.includes('reversa')) {
      resposta = `A **Logística Reversa (Devoluções e Trocas)** é totalmente integrada no módulo **CRM Inteligente**:
1. Vá até o menu lateral **CRM Inteligente** -> aba **Pós-Venda**.
2. No campo **Devoluções e Trocas**, informe o ID da Venda, selecione o Produto da lista, defina a Quantidade devolvida e adicione o Motivo.
3. Ao confirmar, o sistema executa automaticamente:
   - **Retorno de Estoque:** A quantidade do produto é devolvida imediatamente para o estoque de vendas.
   - **Estorno Financeiro:** O valor integral devolvido é creditado diretamente na **Carteira Digital** do cliente (como \`saldo_carteira\`), e poderá ser resgatado como crédito em suas próximas compras!`;
    } else if (msg.includes('comis') || msg.includes('vendedor')) {
      resposta = `As **Comissões de Vendas** são automatizadas:
- Cada vendedor tem uma **taxa de comissão individual** (%) que pode ser editada na tela lateral **Vendedores** clicando no ícone do lápis ✏️.
- A cada venda realizada, o sistema calcula a comissão correspondente e a registra no banco de dados.
- O relatório consolidado de comissões por vendedor pode ser visualizado na aba **Comissões** do menu lateral, agrupando o faturamento total, quantidade de vendas e valor líquido a ser pago de comissão.`;
    } else if (msg.includes('caixa') || msg.includes('sangria') || msg.includes('abertura') || msg.includes('fechamento')) {
      resposta = `O fluxo de **Caixas do PDV** é rigoroso:
- **Abertura:** Para abrir o caixa, informe o valor de **Suprimento (troco inicial)**.
- **Sangria:** Retiradas de dinheiro durante o expediente devem ser registradas informando o valor e motivo.
- **Fechamento:** No encerramento do turno, o operador informa o saldo físico final. O sistema calcula a diferença automática de **Quebra de Caixa** (divergência entre o saldo esperado e o valor físico).
- Todos os caixas ativos e históricos podem ser auditados no menu **Financeiro** -> aba **Caixas (PDV)**.`;
    } else if (msg.includes('crm') || msg.includes('360')) {
      resposta = `O **CRM Inteligente** consolida a visão 360° do cliente:
- **Dados Cadastrais:** Nome, telefone, e-mail, segmento (VIP, Atacadista, etc) e limites de crédito.
- **Histórico & Preferências:** Compras efetuadas, curva de preferência de produtos e última compra.
- **Financeiro:** Limite total vs. disponível, faturas em aberto e LTV total.
- **Timeline de Contatos:** Todas as interações (ligações, e-mails, visitas) registradas com o cliente.`;
    } else if (msg.includes('automat') || msg.includes('whatsapp') || msg.includes('cobran')) {
      resposta = `O sistema possui uma **Régua de Automações** no CRM para pós-venda e recuperação de crédito:
- **Antes do Vencimento:** Notificação automática via WhatsApp 3 dias antes do vencimento do título.
- **No Vencimento:** Alerta no próprio dia de vencimento.
- **Atraso:** Mensagem de cobrança amigável 5 dias após o vencimento.
- **Upsell:** Filtros de clientes baseados em preferências para disparos inteligentes.`;
    } else if (msg.includes('dre') || msg.includes('contas a pagar') || msg.includes('contas a receber')) {
      resposta = `O **Fluxo Financeiro** possui os seguintes componentes:
- **Contas a Pagar / Receber:** Gerencie faturas de fornecedores e títulos de clientes, com status de pendência, data de vencimento e quitação.
- **Visão Geral:** Balanço simplificado de receitas, despesas e saldo líquido real.
- **DRE Simplificado:** Demonstrativo contendo faturamento bruto, custos de mercadorias vendidas, comissões de vendedores, despesas operacionais registradas e o **Lucro Líquido Real** com cálculo de margem percentual.`;
    } else {
      resposta = `Entendi sua dúvida sobre o sistema! O **VarejoOS** é uma plataforma completa que inclui:
- **🏪 Frente de Caixa (PDV):** Lançamento ágil de vendas, cupons, controle de descontos com senha e delivery.
- **📦 Produtos & Estoque:** Controle de variações, custo médio, alertas de estoque crítico e importações.
- **👥 CRM Inteligente 360°:** Oportunidades no Kanban, tickets de suporte (SAC), logística reversa e automações.
- **💰 Financeiro & DRE:** Contas a pagar, contas a receber, fluxo de caixa e relatórios de comissões automáticas.

*Dica: experimente me perguntar sobre "cadastrar produto", "devolução", "desconto com senha" ou "comissão" para informações específicas!*`;
    }

    res.json({ resposta });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/crm/tickets', async (req, res) => {
  try {
    res.json(await asyncAll('SELECT t.*, c.nome as cliente_nome FROM crm_tickets t LEFT JOIN clientes c ON t.cliente_id = c.id ORDER BY t.id DESC'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/crm/tickets', async (req, res) => {
  try {
    const { cliente_id, assunto, descricao, status, prioridade } = req.body;
    const dataCriacao = new Date();
    const slaLimite = new Date();
    slaLimite.setHours(slaLimite.getHours() + 24); // 24 Horas SLA
    const r = await asyncRun('INSERT INTO crm_tickets (cliente_id, assunto, descricao, status, prioridade, data_criacao, sla_limite) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [cliente_id || null, assunto, descricao || '', status || 'aberto', prioridade || 'media', dataCriacao.toISOString(), slaLimite.toISOString()]);
    res.status(201).json({ id: r.id, assunto });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/crm/tickets/:id', async (req, res) => {
  try {
    const { status, prioridade, descricao } = req.body;
    await asyncRun('UPDATE crm_tickets SET status = $1, prioridade = $2, descricao = $3 WHERE id = $4', [status, prioridade, descricao, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/crm/tickets/:id', async (req, res) => {
  try {
    await asyncRun('DELETE FROM crm_tickets WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CRM: Interações ──
app.get('/api/crm/interacoes/:cliente_id', async (req, res) => {
  try {
    res.json(await asyncAll('SELECT * FROM crm_interacoes WHERE cliente_id = $1 ORDER BY data DESC', [req.params.cliente_id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/crm/interacoes', async (req, res) => {
  try {
    const { cliente_id, tipo, detalhe } = req.body;
    const r = await asyncRun('INSERT INTO crm_interacoes (cliente_id, tipo, detalhe) VALUES ($1,$2,$3) RETURNING id', [cliente_id, tipo, detalhe]);
    res.status(201).json({ id: r.id, tipo });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CRM: Logística Reversa (Devoluções e Trocas) ──
app.post('/api/crm/devolucoes', async (req, res) => {
  try {
    const { venda_id, produto_id, quantidade, motivo } = req.body;
    if (!venda_id || !produto_id || !quantidade) return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    
    // Obter dados da venda e produto
    const venda = await asyncGet('SELECT * FROM vendas WHERE id = $1', [venda_id]);
    if (!venda) return res.status(404).json({ error: 'Venda não encontrada.' });
    
    const item = await asyncGet('SELECT * FROM itens_venda WHERE venda_id = $1 AND produto_id = $2', [venda_id, produto_id]);
    if (!item) return res.status(404).json({ error: 'Item não encontrado nesta venda.' });
    
    if (parseInt(quantidade) > parseInt(item.quantidade)) return res.status(400).json({ error: 'Quantidade a devolver excede quantidade comprada.' });
    
    const valorReembolso = parseFloat(item.preco_unitario) * parseInt(quantidade);
    
    // 1. Estorna estoque
    await asyncRun('UPDATE produtos SET estoque_atual = estoque_atual + $1 WHERE id = $2', [quantidade, produto_id]);
    await asyncRun('INSERT INTO estoque_mov (produto_id, tipo, quantidade, data, observacao) VALUES ($1,$2,$3,$4,$5)',
      [produto_id, 'entrada', quantidade, new Date().toISOString(), `Devolução Ref. Venda #${venda_id}`]);
      
    // 2. Credita saldo na carteira do cliente se houver cliente
    if (venda.cliente_id) {
      await asyncRun('UPDATE clientes SET saldo_carteira = saldo_carteira + $1 WHERE id = $2', [valorReembolso, venda.cliente_id]);
      await asyncRun('INSERT INTO crm_interacoes (cliente_id, tipo, detalhe) VALUES ($1,$2,$3)',
        [venda.cliente_id, 'visita', `Crédito de ${valorReembolso.toFixed(2)} gerado por devolução da venda #${venda_id}`]);
    }
    
    res.json({ ok: true, valorReembolso });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CRM: Visão 360º do Cliente ──
app.get('/api/crm/clientes/360/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [cliente, compras, faturas, interacoes] = await Promise.all([
      asyncGet('SELECT * FROM clientes WHERE id = $1', [id]),
      asyncAll('SELECT v.*, u.nome as vendedor_nome FROM vendas v LEFT JOIN usuarios u ON v.usuario_id = u.id WHERE v.cliente_id = $1 ORDER BY v.data DESC', [id]),
      asyncAll('SELECT * FROM contas_receber WHERE cliente_id = $1 ORDER BY data_vencimento ASC', [id]),
      asyncAll('SELECT * FROM crm_interacoes WHERE cliente_id = $1 ORDER BY data DESC', [id])
    ]);
    
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado.' });
    
    // LTV é o somatório de vendas fechadas
    const ltv = compras.reduce((acc, c) => acc + parseFloat(c.total), 0);
    
    res.json({ cliente, compras, faturas, interacoes, ltv });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => console.log(`🚀 VarejoOS rodando em http://localhost:${PORT}`));

module.exports = app;
