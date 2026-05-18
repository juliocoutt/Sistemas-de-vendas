-- Migrações para o Ecossistema Financeiro do VarejoOS

-- 1. Alterações em tabelas existentes
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS caixa_id INTEGER;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS pagamentos JSONB;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS desconto_alcada DECIMAL(5,2) DEFAULT 10.00;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone VARCHAR(50);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS taxa_comissao DECIMAL(5,2) DEFAULT 5.00;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permissoes JSONB DEFAULT '{}';

ALTER TABLE produtos ADD COLUMN IF NOT EXISTS custo_medio DECIMAL(10,4);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS imagem TEXT;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS variacoes JSONB DEFAULT '[]';

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS limite_credito DECIMAL(12,2) DEFAULT 0;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS credito_usado DECIMAL(12,2) DEFAULT 0;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS segmento VARCHAR(50);

-- 2. Criação de novas tabelas

CREATE TABLE IF NOT EXISTS caixas (
  id SERIAL PRIMARY KEY,
  loja_id INTEGER REFERENCES lojas(id),
  usuario_id INTEGER REFERENCES usuarios(id),
  data_abertura TIMESTAMP NOT NULL,
  data_fechamento TIMESTAMP,
  suprimento DECIMAL(10,2) DEFAULT 0,
  total_vendas DECIMAL(10,2) DEFAULT 0,
  total_sangrias DECIMAL(10,2) DEFAULT 0,
  saldo_esperado DECIMAL(10,2) DEFAULT 0,
  saldo_informado DECIMAL(10,2),
  quebra DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'aberto',
  observacao TEXT
);

CREATE TABLE IF NOT EXISTS sangrias (
  id SERIAL PRIMARY KEY,
  caixa_id INTEGER REFERENCES caixas(id),
  usuario_id INTEGER REFERENCES usuarios(id),
  valor DECIMAL(10,2),
  motivo TEXT,
  data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notas_entrada (
  id SERIAL PRIMARY KEY,
  numero_nf VARCHAR(100),
  fornecedor VARCHAR(255),
  data_emissao DATE,
  data_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valor_total DECIMAL(12,2),
  usuario_id INTEGER REFERENCES usuarios(id),
  observacao TEXT
);

CREATE TABLE IF NOT EXISTS itens_nota_entrada (
  id SERIAL PRIMARY KEY,
  nota_id INTEGER REFERENCES notas_entrada(id),
  produto_id INTEGER REFERENCES produtos(id),
  quantidade INTEGER NOT NULL,
  custo_unitario DECIMAL(10,4) NOT NULL
);

CREATE TABLE IF NOT EXISTS contas_pagar (
  id SERIAL PRIMARY KEY,
  descricao TEXT NOT NULL,
  fornecedor VARCHAR(255),
  valor DECIMAL(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status VARCHAR(20) DEFAULT 'pendente',
  categoria VARCHAR(100),
  nota_entrada_id INTEGER REFERENCES notas_entrada(id),
  loja_id INTEGER REFERENCES lojas(id),
  observacao TEXT
);

CREATE TABLE IF NOT EXISTS contas_receber (
  id SERIAL PRIMARY KEY,
  descricao TEXT NOT NULL,
  cliente_id INTEGER REFERENCES clientes(id),
  valor DECIMAL(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_recebimento DATE,
  status VARCHAR(20) DEFAULT 'pendente',
  venda_id INTEGER REFERENCES vendas(id),
  loja_id INTEGER REFERENCES lojas(id),
  observacao TEXT
);
