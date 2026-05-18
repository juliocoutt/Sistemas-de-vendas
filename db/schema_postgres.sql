-- Schema PostgreSQL para o Supabase (VarejoOS)
-- Copie e cole este código no SQL Editor do Supabase e clique em RUN.

CREATE TABLE IF NOT EXISTS lojas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(50),
    endereco TEXT,
    telefone VARCHAR(50),
    email VARCHAR(255),
    logo TEXT
);

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    loja_id INTEGER REFERENCES lojas(id)
);

CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100),
    preco_venda DECIMAL(10,2) NOT NULL,
    custo DECIMAL(10,2),
    estoque_atual INTEGER DEFAULT 0,
    ativo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS estoque_mov (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    tipo VARCHAR(50) NOT NULL,
    quantidade INTEGER NOT NULL,
    data TIMESTAMP NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id),
    observacao TEXT
);

CREATE TABLE IF NOT EXISTS vendas (
    id SERIAL PRIMARY KEY,
    data TIMESTAMP NOT NULL,
    loja_id INTEGER NOT NULL REFERENCES lojas(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    total DECIMAL(10,2) NOT NULL,
    forma_pagamento VARCHAR(50) NOT NULL,
    desconto DECIMAL(10,2) DEFAULT 0,
    campanha_id INTEGER,
    taxa_entrega DECIMAL(10,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS itens_venda (
    id SERIAL PRIMARY KEY,
    venda_id INTEGER NOT NULL REFERENCES vendas(id),
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    quantidade INTEGER NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    is_kit INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cpf_cnpj VARCHAR(50),
    email VARCHAR(255),
    telefone VARCHAR(50),
    pontos INTEGER DEFAULT 0,
    endereco TEXT
);

CREATE TABLE IF NOT EXISTS comissoes (
    id SERIAL PRIMARY KEY,
    venda_id INTEGER NOT NULL REFERENCES vendas(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    valor DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS campanhas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255),
    codigo_cupom VARCHAR(100) UNIQUE,
    tipo_desconto VARCHAR(50),
    valor_desconto DECIMAL(10,2),
    ativo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS despesas (
    id SERIAL PRIMARY KEY,
    descricao TEXT,
    valor DECIMAL(10,2),
    data TIMESTAMP,
    categoria VARCHAR(100),
    loja_id INTEGER REFERENCES lojas(id)
);

CREATE TABLE IF NOT EXISTS kits (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE,
    nome VARCHAR(255),
    preco_venda DECIMAL(10,2),
    ativo INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS kit_produtos (
    kit_id INTEGER REFERENCES kits(id),
    produto_id INTEGER REFERENCES produtos(id),
    quantidade INTEGER
);

CREATE TABLE IF NOT EXISTS entregadores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255),
    veiculo VARCHAR(100),
    placa VARCHAR(50),
    telefone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'disponivel'
);

CREATE TABLE IF NOT EXISTS entregas (
    id SERIAL PRIMARY KEY,
    venda_id INTEGER REFERENCES vendas(id),
    entregador_id INTEGER REFERENCES entregadores(id),
    endereco TEXT,
    status VARCHAR(50) DEFAULT 'aguardando',
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
