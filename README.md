# VarejoOS 🏪

Sistema de gestão para varejo moderno — PDV, estoque, clientes, comissões, CRM e relatórios. Desenvolvido com Node.js, Express e PostgreSQL (Supabase), com interface 100% HTML/CSS/JS puro.

> **Deploy:** [Vercel](https://vercel.com) | **Banco:** [Supabase](https://supabase.com) (PostgreSQL)

---

## 🏗️ Arquitetura

```
VarejoOS/
├── server.js              # API REST (Express + pg)
├── .env                   # Variáveis de ambiente (DATABASE_URL, PORT)
├── package.json
├── vercel.json            # Configuração de deploy na Vercel
└── public/
    ├── index.html         # Tela de login (split-screen com banner dinâmico)
    ├── admin.html         # Painel administrativo (SPA com roteamento JS)
    ├── pdv.html           # Frente de caixa (Point of Sale)
    ├── css/
    │   └── style.css      # Design system (variáveis CSS, componentes)
    └── js/
        ├── api.js         # Camada de comunicação com o backend (fetch wrapper)
        ├── auth.js        # Lógica de autenticação e carregamento de config dinâmica
        └── pdv.js         # Lógica completa do PDV (carrinho, cupons, clientes)
```

### Fluxo de Dados

```
Navegador (HTML/JS) → api.js (fetch) → server.js (Express) → PostgreSQL (Supabase)
```

### Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML5, CSS3 (Vanilla), JavaScript ES2022 |
| Backend | Node.js 18+, Express 4 |
| Banco de Dados | PostgreSQL 15 (Supabase Pooler) |
| Deploy | Vercel (Serverless) |
| Planilhas | SheetJS (xlsx) — importação e exportação |
| Fontes | Google Fonts (Poppins) |

---

## 📦 Módulos Implementados

### ✅ Autenticação & Usuários
- Login com e-mail e senha (hash simples)
- Sessão via `sessionStorage` no cliente
- Roles: `admin`, `superadmin`, `vendedor`, `gestor`
- **Meu Perfil:** foto avatar (Base64), telefone, alteração de senha própria

### ✅ Permissões Granulares (RBAC)
- Controle por módulo para cada vendedor: **Acessar**, **Cadastrar/Editar**, **Excluir**
- Módulos: Dashboard, Financeiro, PDV, Vendas, Produtos, Estoque, Clientes, Entregas
- Menus ocultados automaticamente conforme a permissão do usuário logado

### ✅ Produtos
- CRUD completo (SKU, nome, descrição, categoria, custo, preço de venda, estoque)
- **Upload de imagem** do produto (Base64, até 2 MB)
- **Variações** por vírgula (ex: `P, M, G, Azul, Vermelho`) — salvas em JSONB
- **Importação via Excel** (`.xlsx`) com validação de colunas
- **Download do modelo** de planilha pré-preenchida para facilitar o preenchimento

### ✅ Estoque
- Movimentações: Entrada, Saída, Ajuste manual
- Histórico completo de movimentações com responsável
- **Importação de estoque via Excel** (SKU + nova quantidade em massa)
- **Download do modelo** com SKUs e quantidades atuais do sistema

### ✅ Clientes & CRM
- Cadastro completo: CPF/CNPJ, telefone, e-mail, endereço (busca via ViaCEP)
- Sistema de pontos por fidelidade (acumulam a cada venda)
- **Importação via Excel** de clientes em massa
- **Download do modelo** de planilha de clientes
- CRM / Mensageria: disparo simulado via WhatsApp, E-mail ou SMS segmentado

### ✅ Vendas & PDV
- Frente de caixa (PDV) com busca de produto por nome/SKU
- Suporte a múltiplas formas de pagamento
- Aplicação de cupons promocionais
- Resgate de pontos de fidelidade do cliente
- Venda com entrega (delivery) com taxa de frete
- Geração de cupom/recibo imprimível

### ✅ Kits e Combos
- Agrupamento de produtos em kits com preço especial
- Controle de estoque automático ao vender um kit

### ✅ Vendedores & Comissões
- Cadastro de vendedores com **taxa de comissão individual** (%) configurável
- Visualização do relatório de comissões por vendedor no mês
- Botão de edição rápida da taxa de comissão na listagem

### ✅ Financeiro
- Fluxo de caixa: Receitas vs. Despesas no mês
- Lançamento e exclusão de despesas por categoria
- Saldo líquido em tempo real

### ✅ Logística (Entregas)
- Painel de entregas com status: Aguardando → Em Rota → Entregue
- Cadastro de entregadores
- Despacho de entrega para um entregador específico

### ✅ Configurações (Admin Only)
- Upload de **Logo do Sistema** (PNG transparente, Base64) — aparece na sidebar e no login
- Upload de **Banner da tela de Login** (imagem de fundo da tela de entrada)
- Atualização em tempo real sem redeploy

### ✅ Interface & UX
- Design premium (paleta Azul IBM Carbon, Poppins, modo claro)
- **Sidebar recolhível** via botão ☰ (hamburger menu)
- Responsivo para mobile (sidebar ocultada automaticamente ao clicar fora)
- Dashboard com KPIs centralizados e top 5 produtos mais vendidos
- Animações de entrada (`fadeSlideUp`) nos cards

---

## 🗄️ Schema do Banco de Dados

### Tabelas Principais

| Tabela | Colunas Relevantes |
|--------|-------------------|
| `usuarios` | `id`, `nome`, `email`, `senha_hash`, `role`, `loja_id`, `permissoes` (JSONB), `foto` (TEXT/Base64), `telefone`, `taxa_comissao` |
| `produtos` | `id`, `sku`, `nome`, `descricao`, `categoria`, `preco_venda`, `custo`, `estoque_atual`, `ativo`, `imagem` (Base64), `variacoes` (JSONB) |
| `clientes` | `id`, `nome`, `cpf_cnpj`, `email`, `telefone`, `pontos` |
| `vendas` | `id`, `data`, `total`, `forma_pagamento`, `desconto`, `taxa_entrega`, `loja_id`, `usuario_id`, `campanha_id` |
| `itens_venda` | `id`, `venda_id`, `produto_id`, `quantidade`, `preco_unitario`, `is_kit` |
| `estoque_mov` | `id`, `produto_id`, `tipo`, `quantidade`, `data`, `usuario_id`, `observacao` |
| `kits` | `id`, `sku`, `nome`, `preco_venda`, `ativo` |
| `kit_produtos` | `kit_id`, `produto_id`, `quantidade` |
| `comissoes` | `id`, `venda_id`, `usuario_id`, `valor` |
| `campanhas` | `id`, `nome`, `codigo_cupom`, `tipo_desconto`, `valor_desconto`, `ativo` |
| `despesas` | `id`, `descricao`, `valor`, `data`, `categoria`, `loja_id` |
| `entregas` | `id`, `venda_id`, `entregador_id`, `endereco`, `status`, `data_criacao` |
| `entregadores` | `id`, `nome`, `veiculo`, `placa`, `telefone` |
| `lojas` | `id`, `nome`, `cnpj`, `endereco`, `telefone`, `email` |
| `configuracoes` | `chave`, `valor` — armazena logo_sistema e banner_login |

---

## 🚀 Como Rodar Localmente

```bash
# 1. Clone o repositório
git clone https://github.com/juliocoutt/Sistemas-de-vendas.git
cd Sistemas-de-vendas

# 2. Instale as dependências
npm install

# 3. Configure o ambiente
cp .env.example .env
# Edite .env e defina DATABASE_URL com a string de conexão do Supabase

# 4. Inicie o servidor de desenvolvimento
npm run dev
# Acesse: http://localhost:3001

# Credenciais padrão:
# E-mail: admin@loja.com
# Senha: admin123
```

---

## 🔐 Variáveis de Ambiente

```env
DATABASE_URL=postgres://usuario:senha@host:porta/dbname
PORT=3001
```

---

## 📋 Importação via Excel

O sistema suporta importação em massa de Produtos, Clientes e Estoque.

### Colunas esperadas — Produtos
| Coluna | Obrigatório | Exemplo |
|--------|-------------|---------|
| `sku` | Não | PROD-001 |
| `nome` | **Sim** | Camiseta Básica |
| `descricao` | Não | Algodão 100% |
| `categoria` | Não | Vestuário |
| `custo` | Não | 15.00 |
| `preco_venda` | **Sim** | 39.90 |
| `estoque_atual` | Não | 50 |

### Colunas esperadas — Clientes
| Coluna | Obrigatório | Exemplo |
|--------|-------------|---------|
| `nome` | **Sim** | João da Silva |
| `cpf_cnpj` | Não | 123.456.789-00 |
| `email` | Não | joao@email.com |
| `telefone` | Não | (11) 99999-0000 |

### Colunas esperadas — Estoque (atualização)
| Coluna | Obrigatório | Exemplo |
|--------|-------------|---------|
| `sku` | **Sim** | PROD-001 |
| `quantidade_nova` | **Sim** | 100 |

> 💡 Use o botão **"📝 Baixar Modelo"** em cada tela para obter um arquivo `.xlsx` já pré-formatado com exemplos.

---

## 📄 Licença

Desenvolvido por **Coutt Tecnologia** — Todos os direitos reservados.
