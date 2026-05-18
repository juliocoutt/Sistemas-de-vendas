-- SQLite schema for Sistema de Varejo Completo MVP

-- Lojas
CREATE TABLE IF NOT EXISTS lojas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cnpj TEXT,
    endereco TEXT,
    telefone TEXT,
    email TEXT,
    logo TEXT
);

-- Usuários (admin, vendedores, etc.)
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    role TEXT NOT NULL, -- superadmin, gestor, vendedor, caixa, etc.
    loja_id INTEGER,
    FOREIGN KEY (loja_id) REFERENCES lojas(id)
);

-- Produtos
CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT,
    preco_venda REAL NOT NULL,
    custo REAL,
    estoque_atual INTEGER DEFAULT 0,
    ativo INTEGER DEFAULT 1 -- 1 = ativo, 0 = inativo
);

-- Movimentação de estoque
CREATE TABLE IF NOT EXISTS estoque_mov (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id INTEGER NOT NULL,
    tipo TEXT NOT NULL, -- entrada, saida, ajuste, perda, transferencia, devolucao
    quantidade INTEGER NOT NULL,
    data TEXT NOT NULL,
    usuario_id INTEGER,
    observacao TEXT,
    FOREIGN KEY (produto_id) REFERENCES produtos(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Vendas
CREATE TABLE IF NOT EXISTS vendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    loja_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    total REAL NOT NULL,
    forma_pagamento TEXT NOT NULL,
    FOREIGN KEY (loja_id) REFERENCES lojas(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Itens da venda
CREATE TABLE IF NOT EXISTS itens_venda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venda_id INTEGER NOT NULL,
    produto_id INTEGER NOT NULL,
    quantidade INTEGER NOT NULL,
    preco_unitario REAL NOT NULL,
    FOREIGN KEY (venda_id) REFERENCES vendas(id),
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

-- Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf_cnpj TEXT,
    email TEXT,
    telefone TEXT,
    pontos INTEGER DEFAULT 0
);

-- Comissões
CREATE TABLE IF NOT EXISTS comissoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venda_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    valor REAL NOT NULL,
    FOREIGN KEY (venda_id) REFERENCES vendas(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
