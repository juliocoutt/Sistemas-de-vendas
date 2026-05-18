# 🏪 Sistema de Varejo Completo — Documento de Requisitos (PRD)
**Versão:** 1.0 — MVP + Roadmap  
**Autor:** Julio Couto  
**Data:** Maio 2026  
**Status:** Em elaboração

---

## 📋 Índice

1. [Visão Geral do Produto](#1-visão-geral-do-produto)
2. [Contexto e Objetivos](#2-contexto-e-objetivos)
3. [Módulos do Sistema](#3-módulos-do-sistema)
4. [Módulo 1 — Gestão de Lojas](#módulo-1--gestão-de-lojas)
5. [Módulo 2 — Cadastro de Produtos](#módulo-2--cadastro-de-produtos)
6. [Módulo 3 — Estoque](#módulo-3--estoque)
7. [Módulo 4 — Kits e Combos](#módulo-4--kits-e-combos)
8. [Módulo 5 — Formas de Pagamento](#módulo-5--formas-de-pagamento)
9. [Módulo 6 — Vendas e PDV](#módulo-6--vendas-e-pdv)
10. [Módulo 7 — Vendedores e Comissões](#módulo-7--vendedores-e-comissões)
11. [Módulo 8 — Clientes e Fidelidade](#módulo-8--clientes-e-fidelidade)
12. [Módulo 9 — Promoções e Cupons](#módulo-9--promoções-e-cupons)
13. [Módulo 10 — Campanhas](#módulo-10--campanhas)
14. [Módulo 11 — Comunicação e Mensageria](#módulo-11--comunicação-e-mensageria)
15. [Módulo 12 — Rotas e Entregas](#módulo-12--rotas-e-entregas)
16. [Módulo 13 — Endereço via API Correios](#módulo-13--endereço-via-api-correios)
17. [Módulo 14 — Fiscal (NF-e / NFC-e)](#módulo-14--fiscal-nf-e--nfc-e)
18. [Módulo 15 — Financeiro](#módulo-15--financeiro)
19. [Módulo 16 — Dashboard e Indicadores](#módulo-16--dashboard-e-indicadores)
20. [Módulo 17 — Permissões e Usuários](#módulo-17--permissões-e-usuários)
21. [Módulo 18 — Integrações Externas](#módulo-18--integrações-externas)
22. [Arquitetura Técnica Recomendada](#arquitetura-técnica-recomendada)
23. [Roadmap de Entrega — MVP e Fases](#roadmap-de-entrega--mvp-e-fases)
24. [Orientações para Não Desenvolvedores](#orientações-para-não-desenvolvedores)
25. [Glossário](#glossário)

---

## 1. Visão Geral do Produto

O **Sistema de Varejo Completo** é uma plataforma de gestão comercial multilojas, desenvolvida para operar em loja física, e-commerce próprio e vendas via WhatsApp/redes sociais simultaneamente.

### Proposta de Valor

| Dimensão | Descrição |
|---|---|
| **Para quem** | Proprietários de multilojas de varejo com equipe de 6 a 15 pessoas |
| **Problema que resolve** | Falta de controle integrado de estoque, vendas, comissões e clientes em múltiplos canais |
| **Diferencial** | Sistema único que unifica PDV físico, e-commerce, WhatsApp, campanhas e fidelidade |
| **Canais** | Web responsivo + App mobile (iOS e Android) |

### Princípios de Design do Sistema

- **Modularidade:** cada módulo pode ser ativado/desativado independentemente
- **Escalabilidade:** começa simples (MVP) e cresce por fases sem reescrever código
- **Orientado ao não-desenvolvedor:** painel administrativo visual, sem necessidade de código
- **Multi-loja:** todas as lojas em um único painel com visão consolidada ou individual

---

## 2. Contexto e Objetivos

### Contexto

- **Segmento:** Multilojas (múltiplos segmentos)
- **Canais de venda atuais:** Loja física (balcão), e-commerce próprio, WhatsApp e redes sociais
- **Equipe inicial:** 6 a 15 usuários
- **Acesso:** Web (desktop + mobile responsivo) + App nativo

### Objetivos do Sistema

1. **Centralizar** todas as operações de venda em um único sistema
2. **Automatizar** comissões, promoções e comunicação com clientes
3. **Controlar** estoque, custo, margem e resultado financeiro em tempo real
4. **Fidelizar** clientes com programa de pontos e campanhas segmentadas
5. **Escalar** sem precisar trocar de sistema — arquitetura preparada para crescimento

---

## 3. Módulos do Sistema

### Visão Geral dos Módulos

```
┌─────────────────────────────────────────────────────────────────┐
│                     SISTEMA DE VAREJO                           │
├──────────────┬──────────────┬───────────────┬───────────────────┤
│  OPERAÇÃO    │   COMERCIAL  │  CLIENTES     │  GESTÃO           │
├──────────────┼──────────────┼───────────────┼───────────────────┤
│ • PDV        │ • Vendedores │ • Cadastro    │ • Dashboard       │
│ • Estoque    │ • Comissões  │ • Fidelidade  │ • Financeiro      │
│ • Produtos   │ • Promoções  │ • Campanhas   │ • Fiscal NF-e     │
│ • Kits       │ • Campanhas  │ • Mensageria  │ • Permissões      │
│ • Rotas      │ • Pagamentos │ • Pontos      │ • Integrações     │
└──────────────┴──────────────┴───────────────┴───────────────────┘
```

### Classificação por Prioridade

| Prioridade | Módulo | Fase |
|---|---|---|
| 🔴 Crítico | PDV, Produtos, Estoque, Pagamentos, Usuários | MVP |
| 🟠 Alta | Vendedores, Comissões, Clientes, Fiscal | Fase 2 |
| 🟡 Média | Promoções, Fidelidade, Dashboard completo | Fase 2 |
| 🟢 Expansão | Campanhas, Mensageria, Rotas, App mobile | Fase 3 |
| 🔵 Futuro | Integrações marketplace, BI avançado | Fase 4 |

---

## Módulo 1 — Gestão de Lojas

### Descrição
Permite cadastrar e gerenciar múltiplas lojas/unidades dentro de um único sistema, com controle individual ou consolidado.

### Funcionalidades

- **Cadastro de lojas:** nome, CNPJ, endereço, telefone, e-mail, logo
- **Configuração por loja:** horário de funcionamento, responsável, segmento
- **Visão consolidada:** indicadores de todas as lojas somados
- **Visão individual:** filtrar qualquer relatório por loja específica
- **Transferência entre lojas:** movimentação de estoque entre unidades com registro

### Regras de Negócio

- Cada loja tem seu próprio CNPJ (necessário para emissão de NF-e separada)
- Um usuário pode ter acesso a uma ou mais lojas (definido em Permissões)
- O estoque é centralizado, mas com identificação de localização por loja

---

## Módulo 2 — Cadastro de Produtos

### Descrição
Gestão completa do catálogo de produtos com suporte a variações, custo, margem e múltiplas imagens.

### Funcionalidades

#### 2.1 Produto Simples
- Nome, descrição, SKU (código único), código de barras (EAN)
- Categoria e subcategoria (hierarquia até 3 níveis)
- Fornecedor vinculado
- Unidade de medida (un, kg, caixa, par etc.)
- Peso e dimensões (para cálculo de frete)
- Múltiplas imagens (até 10 por produto)
- Status: ativo / inativo / rascunho

#### 2.2 Produto com Variações
- Atributos configuráveis: cor, tamanho, sabor, voltagem etc.
- Cada combinação gera um **SKU filho** único
- Cada variação tem: preço de custo próprio, preço de venda próprio, estoque próprio
- Tabela de variações visual (matriz cor × tamanho, por exemplo)
- Imagem específica por variação

#### 2.3 Precificação
- **Custo de compra:** valor pago ao fornecedor
- **Custo operacional adicional:** frete de entrada, impostos, embalagem
- **Custo total calculado automaticamente**
- **Margem de lucro (%):** definida pelo gestor
- **Preço de venda sugerido:** calculado automaticamente (custo ÷ (1 - margem))
- **Preço de venda final:** pode ser ajustado manualmente
- **Tabelas de preço:** varejo, atacado, parceiro, promoção
- **Preço por canal:** preço diferenciado para loja física vs. e-commerce

#### 2.4 Atributos Adicionais
- Tags para busca interna
- Produto destacado (aparece em destaque no e-commerce)
- Produto novo (badge "Novo" automático)
- Produto com frete grátis habilitado
- Integração com SEO (título, descrição, URL amigável)
- Campo de observação interna (não aparece para cliente)

### Regras de Negócio

- Todo produto precisa de SKU único (gerado automaticamente ou informado)
- Custo é campo obrigatório para habilitar controle de margem no dashboard
- Produto inativo não aparece no PDV nem no e-commerce, mas mantém histórico
- Variações herdam dados do produto pai, mas podem ser sobrescritos individualmente

---

## Módulo 3 — Estoque

### Descrição
Controle de inventário centralizado com rastreabilidade de todas as movimentações.

### Funcionalidades

#### 3.1 Controle de Quantidade
- Estoque atual por SKU
- Estoque mínimo (ponto de reposição) — alerta automático quando atingido
- Estoque máximo (capacidade de armazenamento)
- Localização física (prateleira, corredor, galpão)
- Lote e validade (para produtos perecíveis)

#### 3.2 Movimentações
- **Entrada:** recebimento de mercadoria (vinculado a pedido de compra)
- **Saída:** venda (automática via PDV)
- **Ajuste:** correção de inventário com motivo obrigatório
- **Perda:** registro de avaria, vencimento, furto com motivo e responsável
- **Transferência:** entre lojas ou entre localizações
- **Devolução:** entrada de produto devolvido pelo cliente

#### 3.3 Inventário
- Contagem periódica com geração de romaneio
- Comparativo: estoque sistema vs. contagem física
- Registro de divergências e ajuste automático após aprovação do gestor
- Histórico completo de inventários anteriores

#### 3.4 Alertas
- Estoque abaixo do mínimo (push + e-mail para gestor)
- Produto sem movimentação há X dias (giro zero)
- Vencimento próximo (para produtos com validade)

### Regras de Negócio

- Venda no PDV baixa automaticamente o estoque
- Não é permitido vender produto com estoque zero (configurável: pode habilitar venda negativa para casos específicos)
- Todo ajuste de estoque exige motivo e é registrado com usuário, data e hora
- Custo médio é recalculado automaticamente a cada entrada de mercadoria

---

## Módulo 4 — Kits e Combos

### Descrição
Permite criar agrupamentos de produtos vendidos como um único item, com SKU próprio e preço diferenciado.

### Funcionalidades

#### 4.1 Kit Fixo
- Composição predefinida de produtos (ex.: "Kit Presente Premium" = produto A + produto B + embalagem)
- SKU próprio do kit
- Preço do kit (pode ser menor que a soma das partes)
- Imagem e descrição próprias
- Estoque descontado dos componentes individualmente na venda
- Custo calculado automaticamente pela soma dos custos dos componentes

#### 4.2 Kit Montado na Hora (Combo Personalizado)
- Vendedor escolhe os itens no momento da venda
- Regras de composição: mínimo/máximo de itens, categorias permitidas
- Desconto automático aplicado ao montar o combo
- Útil para presentes personalizados, cestas etc.

#### 4.3 Embalagem e Personalização
- Campo para personalização (nome no cartão, mensagem etc.)
- Custo de personalização adicionado ao preço
- Integração com módulo de rotas para entrega de kits

### Regras de Negócio

- Ao vender um kit, o sistema debita o estoque de cada componente separadamente
- Se algum componente estiver sem estoque, o kit não pode ser vendido (salvo exceção configurada)
- O custo do kit é sempre a soma dos custos dos componentes (nunca manual)
- O preço de venda do kit pode ser configurado livremente

---

## Módulo 5 — Formas de Pagamento

### Descrição
Cadastro e gestão de todos os meios de pagamento aceitos, com controle de taxas e conciliação.

### Funcionalidades

#### 5.1 Meios Suportados
- **Dinheiro:** troco calculado automaticamente
- **PIX:** geração de QR Code ou cópia e cola
- **Cartão de débito:** integração com maquininha
- **Cartão de crédito:** integração com maquininha, parcelamento até X vezes
- **Parcelamento próprio (carnê/fiado):** geração de parcelas com vencimento, controle de recebimento
- **Crédito na loja:** saldo disponível do cliente usado como pagamento
- **Misto:** pagamento em mais de uma forma na mesma venda

#### 5.2 Integração com Maquininha
- Compatível com: Stone, Cielo, PagSeguro, Rede, Getnet
- Configuração por loja (cada loja tem sua maquininha)
- Registro automático da transação após aprovação
- Conciliação automática: vendas no sistema vs. extrato da maquininha

#### 5.3 Configuração de Taxas
- Taxa por meio de pagamento (ex.: crédito 3,5%, débito 1,5%)
- Taxa de parcelamento (juros ao cliente ou absorvido pela loja)
- Prazo de recebimento por meio (D+0 PIX, D+1 débito, D+30 crédito)
- Impacto da taxa no cálculo de margem (exibido no dashboard)

#### 5.4 Carnê / Parcelamento Próprio
- Geração de carnê imprimível ou digital (PDF/WhatsApp)
- Vencimento configurável por parcela
- Alerta automático de parcela próxima do vencimento (WhatsApp/SMS/e-mail)
- Registro de pagamento por parcela
- Cobrança de juros por atraso (configurável)
- Relatório de inadimplência

### Regras de Negócio

- Desconto em dinheiro pode ser configurado como padrão
- Pagamento misto: sistema divide os valores e registra cada forma separadamente
- Crédito na loja não pode ultrapassar limite definido por cliente
- Toda venda parcelada no carnê gera automaticamente as parcelas no contas a receber

---

## Módulo 6 — Vendas e PDV

### Descrição
Ponto de Venda (PDV) para uso no balcão da loja física e também para registro de vendas feitas via WhatsApp/redes sociais.

### Funcionalidades

#### 6.1 PDV Balcão
- Interface simplificada para uso com teclado, mouse ou touch screen
- Busca de produto por: nome, SKU, código de barras, categoria
- Scanner de código de barras (câmera do celular ou leitor USB)
- Adição de itens ao carrinho com quantidade e variação
- Desconto por item ou desconto global na venda
- Seleção de vendedor responsável
- Seleção de cliente (ou venda sem identificação)
- Aplicação de cupom de desconto
- Seleção de forma de pagamento (simples ou misto)
- Emissão de NFC-e (nota fiscal do consumidor) integrada
- Impressão de cupom não-fiscal (para lojas sem obrigatoriedade)
- Envio do comprovante por WhatsApp ou e-mail

#### 6.2 Venda via WhatsApp (Pedido Manual)
- Criação de pedido a partir do painel administrativo
- Seleção de cliente, itens, quantidades e desconto
- Geração de link de pagamento (PIX ou boleto)
- Envio automático do pedido formatado para WhatsApp do cliente
- Acompanhamento de status: aguardando pagamento → pago → em separação → entregue

#### 6.3 Venda via E-commerce
- Integração com módulo de e-commerce próprio
- Pedidos do e-commerce aparecem automaticamente no painel
- Mesmo fluxo de separação, faturamento e entrega do pedido físico

#### 6.4 Histórico de Vendas
- Lista de todas as vendas com filtros: data, loja, vendedor, cliente, status, forma de pagamento
- Detalhes completos de cada venda
- Cancelamento com motivo obrigatório e estorno automático de estoque
- Devolução parcial ou total com geração de crédito ou reembolso
- Reimpressão de nota fiscal ou comprovante

### Regras de Negócio

- Toda venda está vinculada a um vendedor
- Cancelamento só é permitido por perfis com permissão específica
- Venda cancelada não gera comissão
- Desconto acima de X% exige aprovação de gestor (configurável)
- Venda negativa de estoque pode ser habilitada por exceção

---

## Módulo 7 — Vendedores e Comissões

### Descrição
Gestão de equipe de vendas com cálculo automático de comissões por múltiplas regras simultâneas.

### Funcionalidades

#### 7.1 Cadastro de Vendedor
- Nome, CPF, e-mail, telefone, foto
- Loja(s) vinculada(s)
- Tipo: vendedor interno (balcão), vendedor externo (rota), ambos
- Meta mensal de vendas (valor R$ ou quantidade)
- Status: ativo / inativo / férias / afastado
- Data de admissão e histórico de alterações

#### 7.2 Regras de Comissão

O sistema suporta múltiplas regras simultâneas com hierarquia de prioridade:

**Tipo 1 — % Fixa por Vendedor**
- Percentual fixo sobre o valor líquido de todas as vendas do vendedor
- Ex.: João recebe 5% sobre tudo que vende

**Tipo 2 — % Variável por Produto ou Categoria**
- Percentual diferente para cada produto ou categoria
- Ex.: Categoria A = 3%, Categoria B = 7%, Produto X = 10%
- Regra mais específica (produto) prevalece sobre a mais genérica (categoria)

**Tipo 3 — Comissão por Campanha**
- Percentual adicional ou substituto durante uma campanha ativa
- Ex.: Na campanha "Verão", produto Y paga 12% em vez de 7%
- Vigência por data de início e fim da campanha

**Tipo 4 — Meta + Bônus por Superação**
- Comissão base até atingir a meta
- Comissão adicional (bônus) sobre o valor acima da meta
- Ex.: 5% até R$ 10.000 → 8% sobre o que superar R$ 10.000

#### 7.3 Cálculo e Relatórios
- Cálculo automático ao fechar cada venda
- Relatório de comissão por vendedor por período
- Extrato detalhado: venda por venda com comissão calculada
- Aprovação de comissão pelo gestor antes de liberar para pagamento
- Exportação em Excel para folha de pagamento
- Ranking de vendedores por valor vendido e por comissão gerada

### Regras de Negócio

- Comissão é calculada sobre o valor líquido (após descontos)
- Venda cancelada remove a comissão correspondente automaticamente
- Regras de comissão podem ser aplicadas por combinação: produto + campanha + meta simultaneamente
- Período de apuração configurável: semanal, quinzenal ou mensal

---

## Módulo 8 — Clientes e Fidelidade

### Descrição
CRM básico de clientes com programa de fidelidade por pontos integrado.

### Funcionalidades

#### 8.1 Cadastro de Cliente
- Nome completo, CPF/CNPJ, data de nascimento
- Endereço completo (preenchimento automático via CEP — API Correios)
- Telefone(s), e-mail
- Canal de origem: como o cliente chegou (indicação, Instagram, Google, loja física etc.)
- Observações internas
- Foto (opcional)
- Status: ativo / bloqueado / inativo

#### 8.2 Histórico do Cliente
- Todas as compras realizadas com valores e datas
- Ticket médio, frequência de compra, última compra
- Produtos favoritos (mais comprados)
- Pontos acumulados e histórico de resgates
- Crédito disponível na loja
- Parcelas em aberto (carnê)
- Campanhas recebidas e taxa de resposta

#### 8.3 Programa de Fidelidade — Pontos
- **Acúmulo:** X pontos por R$ 1,00 gasto (configurável por categoria ou produto)
- **Bônus de pontos:** campanhas de pontos em dobro, triplo etc.
- **Validade dos pontos:** configurável (ex.: expiram em 12 meses sem uso)
- **Resgate:** X pontos = R$ Y de desconto (configurável)
- **Resgate mínimo:** valor mínimo de pontos para usar
- **Extrato de pontos:** histórico de acúmulo e uso por cliente
- **Categorias de cliente por pontos:**
  - Bronze: 0 a 999 pontos
  - Prata: 1.000 a 4.999 pontos
  - Ouro: 5.000 a 14.999 pontos
  - Diamante: 15.000+ pontos
- **Benefícios por categoria:** desconto exclusivo, frete grátis, atendimento prioritário etc.

#### 8.4 Segmentação de Clientes
- Por categoria de fidelidade (Bronze, Prata, Ouro, Diamante)
- Por frequência de compra (recorrente, ocasional, inativo)
- Por ticket médio (alto, médio, baixo)
- Por canal preferido
- Por data de último pedido (clientes que não compram há X dias)
- Por produto/categoria de interesse
- Segmentos usados diretamente para disparar campanhas

### Regras de Negócio

- Pontos só são creditados após pagamento confirmado
- Pontos de venda cancelada são estornados automaticamente
- Cliente bloqueado não pode fazer novas compras no crédito da loja
- Aniversariante recebe e-mail/WhatsApp automático com oferta especial (configurável)

---

## Módulo 9 — Promoções e Cupons

### Descrição
Motor de promoções flexível que suporta múltiplos tipos de desconto simultâneos.

### Funcionalidades

#### 9.1 Tipos de Promoção

| Tipo | Descrição | Exemplo |
|---|---|---|
| **Desconto % no produto** | Reduz percentualmente o preço de um ou mais produtos | Produto X com 20% off |
| **Desconto R$ fixo** | Valor fixo deduzido do produto ou do carrinho | R$ 15 de desconto na compra |
| **Leve X pague Y** | Cliente leva mais, paga menos | Leve 3, pague 2 |
| **Frete grátis** | Isenção de frete acima de valor mínimo ou para produto específico | Frete grátis acima de R$ 150 |
| **Cupom de desconto** | Código inserido no checkout que aplica desconto | VERÃO20 = 20% off |
| **Promoção por data** | Ativa/desativa automaticamente por data | Black Friday, aniversário da loja |
| **Desconto por categoria** | Desconto em toda uma categoria de produtos | 15% em todos os perfumes |
| **Desconto por cliente** | Promoção exclusiva para cliente ou segmento | Ouro: 10% extra sempre |

#### 9.2 Configuração de Promoção
- Nome e descrição da promoção
- Data e hora de início e fim (ativação automática)
- Aplicável a: produto específico, categoria, toda a loja, segmento de clientes
- Limite de usos total (ex.: promoção válida para os primeiros 100 clientes)
- Limite de usos por cliente (ex.: 1 uso por CPF)
- Valor mínimo de compra para ativar
- Combinável com outros descontos: sim/não
- Prioridade (quando há múltiplas promoções, qual prevalece)

#### 9.3 Cupons de Desconto
- Código alfanumérico (gerado automaticamente ou definido manualmente)
- Geração em lote (ex.: 500 cupons para campanha)
- Cupom de uso único ou múltiplo
- Rastreabilidade: quem usou, quando, valor descontado
- Cupom vinculado a vendedor (rastreia conversão de indicação)

### Regras de Negócio

- Promoções com data expirada são desativadas automaticamente
- Desconto nunca pode resultar em preço negativo
- Desconto acima do limite configurado exige aprovação de gestor
- Toda promoção aplicada na venda é registrada para relatório de impacto

---

## Módulo 10 — Campanhas

### Descrição
Módulo para planejar, executar e medir campanhas comerciais com foco em resultados.

### Funcionalidades

#### 10.1 Criação de Campanha
- Nome, objetivo e descrição da campanha
- Período: data início e fim
- Público-alvo: todos os clientes ou segmento específico
- Canal de comunicação: WhatsApp, e-mail, SMS, push, combinado
- Produto(s) ou categoria(s) em destaque na campanha
- Promoção vinculada (desconto específico da campanha)
- Comissão especial para vendedores durante a campanha
- Meta de vendas da campanha (R$ ou unidades)
- Responsável pela campanha

#### 10.2 Tipos de Campanha
- **Campanha de lançamento:** novo produto ou coleção
- **Campanha sazonal:** datas comemorativas (Natal, Dia dos Namorados etc.)
- **Campanha de reativação:** clientes inativos há X dias
- **Campanha de fidelidade:** exclusiva para clientes Ouro/Diamante
- **Campanha flash:** duração curta com alta urgência (24h, 48h)
- **Campanha de aniversariante:** disparo automático no mês do aniversário

#### 10.3 Acompanhamento
- Quantidade de mensagens enviadas
- Taxa de abertura (e-mail) e visualização (WhatsApp)
- Clientes que compraram após receber a campanha
- Receita gerada pela campanha
- ROI da campanha (receita gerada vs. custo de envio)
- Comparativo com campanhas anteriores

---

## Módulo 11 — Comunicação e Mensageria

### Descrição
Central de comunicação com clientes por múltiplos canais, com automações e templates.

### Funcionalidades

#### 11.1 Canais Suportados
- **WhatsApp Business API:** mensagens em escala, templates aprovados pela Meta
- **E-mail marketing:** envio de campanhas HTML com rastreamento de abertura/clique
- **SMS:** mensagens curtas para alertas e confirmações
- **Push Notification:** notificações no app mobile

#### 11.2 Templates de Mensagem
- Biblioteca de templates por finalidade: boas-vindas, cobrança, promoção, confirmação de pedido, aniversário
- Personalização com variáveis: {nome_cliente}, {valor_pedido}, {link_pagamento}, {pontos_acumulados}
- Templates para WhatsApp precisam ser aprovados pela Meta (orientação no sistema)
- Pré-visualização antes de enviar

#### 11.3 Automações (Gatilhos Automáticos)
| Gatilho | Ação | Canal |
|---|---|---|
| Nova venda concluída | Confirmação de pedido | WhatsApp/E-mail |
| Parcela vencendo em 3 dias | Lembrete de pagamento | WhatsApp/SMS |
| Parcela em atraso | Cobrança amigável | WhatsApp/SMS/E-mail |
| Aniversário do cliente | Mensagem + oferta especial | WhatsApp/E-mail |
| Cliente inativo há 30/60/90 dias | Reativação | WhatsApp/E-mail |
| Estoque do produto favorito reposto | Aviso de disponibilidade | WhatsApp/Push |
| Pontos prestes a expirar | Lembrete de resgate | WhatsApp/E-mail |
| Pedido em separação | Atualização de status | WhatsApp |
| Pedido saiu para entrega | Notificação de envio | WhatsApp/Push |

#### 11.4 Disparo Manual
- Seleção de segmento de clientes
- Escolha de template ou mensagem livre
- Agendamento de data e hora de envio
- Confirmação com preview e total de destinatários antes de enviar

### Regras de Negócio

- Opt-out: cliente pode solicitar descadastro de comunicações (LGPD)
- Limite de disparos por dia para evitar bloqueio da conta WhatsApp
- Histórico de todas as mensagens enviadas por cliente
- Relatório de entrega, leitura e resposta

---

## Módulo 12 — Rotas e Entregas

### Descrição
Gestão de entregas com motoboy próprio, roteirização e rastreamento de status.

### Funcionalidades

#### 12.1 Cadastro de Entregador
- Nome, CPF, telefone, foto
- Veículo: moto, bike, carro
- Placa, CNH, seguro
- Status: disponível / em rota / indisponível

#### 12.2 Gestão de Entregas
- Pedidos disponíveis para entrega (separados e prontos)
- Atribuição de entregador ao pedido
- Agrupamento de pedidos por região para uma única rota
- Ordem de entrega sugerida (otimização de rota por proximidade)
- Integração com Google Maps para navegação

#### 12.3 Rastreamento
- Status da entrega: aguardando → coletado → em rota → entregue / tentativa frustrada
- Atualização de status pelo entregador via app mobile
- Notificação automática ao cliente quando pedido sai para entrega
- Registro de entrega com assinatura digital ou foto como comprovante
- Histórico de rotas por entregador

#### 12.4 Controle de Custos
- Custo de entrega por pedido (combustível, manutenção)
- Taxa de entrega cobrada do cliente
- Relatório de entregas por período e por entregador

---

## Módulo 13 — Endereço via API Correios

### Descrição
Preenchimento automático de endereço ao digitar o CEP, usando a API dos Correios (ViaCEP).

### Funcionalidades

- Campo de CEP com máscara automática (00000-000)
- Ao digitar o CEP, preenche automaticamente: logradouro, bairro, cidade, estado
- Usuário completa apenas: número e complemento
- Validação de CEP inexistente com mensagem amigável
- Disponível em todos os formulários que precisam de endereço: cliente, fornecedor, loja, entrega

### Detalhes Técnicos

- API utilizada: **ViaCEP** (https://viacep.com.br) — gratuita e sem necessidade de cadastro
- Endpoint: `GET https://viacep.com.br/ws/{cep}/json/`
- Fallback: se a API estiver indisponível, usuário preenche manualmente
- Cache local de CEPs consultados para reduzir chamadas à API

---

## Módulo 14 — Fiscal (NF-e / NFC-e)

### Descrição
Emissão de notas fiscais eletrônicas integrada ao PDV e ao módulo de vendas.

### Funcionalidades

#### 14.1 NFC-e (Nota Fiscal do Consumidor Eletrônica)
- Emissão no ato da venda no balcão
- Impressão em impressora térmica (bobina 80mm)
- Envio por e-mail ou WhatsApp para o cliente
- Cancelamento de NFC-e (dentro do prazo legal)

#### 14.2 NF-e (Nota Fiscal Eletrônica — Saída)
- Emissão para vendas para CNPJ ou vendas de maior valor
- Geração de XML e DANFE (PDF)
- Envio automático ao cliente por e-mail

#### 14.3 Configuração Fiscal
- Cadastro do certificado digital A1 ou A3
- Configuração de CFOP por tipo de venda (venda interna, interestadual etc.)
- Cadastro de CST/CSOSN (regime tributário: Simples Nacional ou Lucro Presumido)
- Alíquotas de ICMS, PIS, COFINS, ISS por produto/categoria
- Integração com SEFAZ estadual

#### 14.4 Relatórios Fiscais
- SPED Fiscal básico
- Relatório de notas emitidas por período
- Notas canceladas e inutilizadas

> ⚠️ **Orientação:** A configuração fiscal exige um contador ou consultor tributário. O sistema armazena as configurações, mas os parâmetros corretos (CFOP, alíquotas, regime) devem ser definidos por um profissional habilitado.

---

## Módulo 15 — Financeiro

### Descrição
Controle financeiro completo com contas a pagar, a receber, fluxo de caixa e DRE simplificado.

### Funcionalidades

#### 15.1 Contas a Receber
- Gerado automaticamente pelas vendas (parcelas, carnê, crédito)
- Registro manual de recebimentos avulsos
- Status: aberto / parcialmente pago / pago / vencido / cancelado
- Baixa manual ou automática (integração com banco via Open Finance — fase futura)
- Relatório de inadimplência com dias em atraso

#### 15.2 Contas a Pagar
- Cadastro de fornecedores com CNPJ
- Lançamento de contas: fornecedor, valor, vencimento, categoria
- Recorrência (conta fixa mensal: aluguel, energia, internet)
- Aprovação de pagamento por gestor
- Exportação para pagamento em internet banking

#### 15.3 Fluxo de Caixa
- Visão diária/semanal/mensal de entradas e saídas
- Projeção futura baseada em contas a pagar e a receber cadastradas
- Saldo atual disponível
- Gráfico de fluxo de caixa

#### 15.4 DRE Simplificado (Demonstrativo de Resultado)
- Receita bruta de vendas
- Devoluções e cancelamentos
- Receita líquida
- Custo dos produtos vendidos (CMV)
- Lucro bruto e margem bruta (%)
- Despesas operacionais
- Lucro operacional e margem operacional (%)
- Período: mensal, trimestral, anual

#### 15.5 Custo e Margem por Produto
- Margem bruta por produto/categoria/loja
- Produtos com margem negativa (alerta)
- Impacto de taxas de pagamento na margem real

---

## Módulo 16 — Dashboard e Indicadores

### Descrição
Painel visual com os principais indicadores do negócio em tempo real.

### Indicadores Disponíveis

#### 16.1 Visão Geral (Home do Dashboard)
- Faturamento do dia / semana / mês
- Número de vendas no período
- Ticket médio
- Clientes novos vs. recorrentes
- Comparativo com período anterior (% variação)

#### 16.2 Dashboard Financeiro
- DRE resumido com gráfico de barras
- Fluxo de caixa projetado vs. realizado
- Contas a pagar e a receber vencendo nos próximos 7 dias
- Inadimplência: valor total em aberto

#### 16.3 Dashboard de Vendas
- Ranking de vendedores (por valor vendido)
- Produtos mais vendidos (Top 10)
- Categorias mais vendidas
- Hora de pico de vendas (heatmap por hora/dia da semana)
- Vendas por canal (loja física, e-commerce, WhatsApp)

#### 16.4 Dashboard de Estoque
- Produtos com estoque crítico (abaixo do mínimo)
- Produtos sem giro nos últimos 30/60/90 dias
- Valor total do estoque (custo)
- Giro de estoque por categoria

#### 16.5 Dashboard de Campanhas
- Campanhas ativas e resultados em tempo real
- Taxa de conversão (enviados → compraram)
- Receita gerada por campanha
- Comparativo entre campanhas

#### 16.6 Filtros e Personalização
- Filtro por loja, período, vendedor, categoria
- Exportação em PDF ou Excel
- Agendamento de relatório (receber por e-mail toda segunda-feira, por exemplo)

---

## Módulo 17 — Permissões e Usuários

### Descrição
Sistema de controle de acesso baseado em perfis com permissões granulares.

### Perfis Padrão

| Perfil | Descrição |
|---|---|
| **Super Admin** | Acesso total. Configurações do sistema, criação de lojas, relatórios globais |
| **Gestor de Loja** | Acesso total à sua loja. Não vê outras lojas. Aprova descontos e comissões |
| **Vendedor** | Acesso ao PDV, consulta de produtos e estoque. Não vê financeiro nem custo |
| **Caixa** | Acesso ao PDV e formas de pagamento. Não pode cancelar venda |
| **Estoquista** | Cadastro de produtos, movimentações de estoque. Não vê financeiro |
| **Financeiro** | Contas a pagar/receber, fluxo de caixa, DRE. Não acessa PDV |
| **Entregador** | Acesso apenas ao app de entregas (rotas e status) |
| **Marketing** | Acesso a campanhas, clientes e mensageria. Sem acesso a financeiro |

### Funcionalidades

- Criação de perfis customizados além dos padrões
- Permissões granulares por módulo e ação (visualizar / criar / editar / excluir / aprovar)
- Vínculo de usuário a uma ou mais lojas específicas
- Log de auditoria: todas as ações do usuário registradas com data/hora/IP
- Autenticação: e-mail + senha com 2FA (autenticação de dois fatores) opcional
- Recuperação de senha por e-mail
- Sessão com tempo de expiração configurável

---

## Módulo 18 — Integrações Externas

### Integrações Planejadas

| Integração | Finalidade | Fase |
|---|---|---|
| **ViaCEP / Correios** | Preenchimento de endereço por CEP | MVP |
| **Stone / Cielo / PagSeguro** | Maquininha de cartão | Fase 2 |
| **WhatsApp Business API** | Mensagens em escala | Fase 2 |
| **SEFAZ** | Emissão de NF-e / NFC-e | Fase 2 |
| **Google Maps** | Roteirização de entregas | Fase 3 |
| **SendGrid / Amazon SES** | Envio de e-mails transacionais | Fase 2 |
| **Twilio** | Envio de SMS | Fase 3 |
| **Firebase** | Push notification no app | Fase 3 |
| **Open Finance (Banco Central)** | Conciliação bancária automática | Fase 4 |
| **Mercado Livre / Shopee** | Sincronização de produtos e pedidos | Fase 4 |
| **Contabilizei / Omie** | Integração contábil | Fase 4 |

---

## Arquitetura Técnica Recomendada

> Esta seção é para orientar o desenvolvedor que vai construir o sistema.

### Stack Recomendada (Custo-benefício para MVP)

| Camada | Tecnologia | Motivo |
|---|---|---|
| **Frontend Web** | React.js + Tailwind CSS | Amplamente usado, fácil de contratar |
| **App Mobile** | React Native | Mesmo código base para iOS e Android |
| **Backend (API)** | Node.js + Express ou NestJS | Rápido, escalável, muitos devs disponíveis |
| **Banco de Dados** | PostgreSQL | Relacional, robusto para dados de varejo |
| **Cache** | Redis | Performance em sessões e consultas frequentes |
| **Armazenamento de arquivos** | AWS S3 ou Cloudflare R2 | Imagens de produtos, documentos |
| **Hospedagem** | Railway ou Render (MVP) → AWS/GCP (escala) | Barato para começar |
| **Autenticação** | JWT + bcrypt | Padrão seguro |
| **Filas de mensagens** | BullMQ (Node.js) | Para disparos de mensagens em lote |
| **CI/CD** | GitHub Actions | Deploy automático |

### Modelo de Dados (Entidades Principais)

```
Lojas ──< Produtos ──< Variações
       ──< Usuários ──< Permissões
       ──< Vendas ──< ItensDaVenda
                  ──< Pagamentos
                  ──< Comissões

Clientes ──< Compras
         ──< Pontos
         ──< Endereços

Kits ──< ComponentesDoKit

Campanhas ──< DisparosMensagem
          ──< Promoções

Vendedores ──< RegrasDeComissão
           ──< Metas
```

### Segurança

- HTTPS obrigatório em todas as rotas
- Dados sensíveis criptografados no banco (CPF, e-mail)
- Rate limiting para evitar ataques de força bruta
- Backup automático diário do banco de dados
- Conformidade com LGPD: consentimento de uso de dados, opt-out de comunicações

---

## Roadmap de Entrega — MVP e Fases

### 🔴 MVP (Mês 1-3) — Loja funcionando no básico

| # | Funcionalidade | Descrição |
|---|---|---|
| 1 | Cadastro de lojas | Múltiplas lojas no mesmo sistema |
| 2 | Cadastro de produtos simples | Com custo e preço de venda |
| 3 | Controle de estoque básico | Entrada, saída, ajuste |
| 4 | PDV básico | Venda, pagamento, comprovante |
| 5 | Formas de pagamento | Dinheiro, Pix, cartão |
| 6 | Cadastro de clientes | Com CEP automático |
| 7 | Usuários e permissões | Perfis básicos |
| 8 | Dashboard básico | Faturamento e estoque |

### 🟠 Fase 2 (Mês 4-6) — Controle completo

| # | Funcionalidade |
|---|---|
| 9 | Produtos com variações |
| 10 | Kits fixos e combos |
| 11 | Vendedores e comissões |
| 12 | Promoções e cupons |
| 13 | Programa de fidelidade (pontos) |
| 14 | Parcelamento próprio (carnê) |
| 15 | Emissão de NF-e / NFC-e |
| 16 | Módulo financeiro (contas a pagar/receber, DRE) |
| 17 | Dashboard completo |

### 🟡 Fase 3 (Mês 7-9) — Escala e automação

| # | Funcionalidade |
|---|---|
| 18 | Módulo de campanhas |
| 19 | Mensageria (WhatsApp API, e-mail, SMS) |
| 20 | Automações de comunicação |
| 21 | Módulo de rotas e entregas |
| 22 | App mobile (iOS e Android) |
| 23 | Push notification |

### 🔵 Fase 4 (Mês 10+) — Integrações avançadas

| # | Funcionalidade |
|---|---|
| 24 | Integração com marketplaces (ML, Shopee) |
| 25 | Open Finance (conciliação bancária) |
| 26 | BI avançado com projeções |
| 27 | Integração contábil |

---

## Orientações para Não Desenvolvedores

Esta seção te orienta sobre o que você precisará fazer em cada etapa.

### Para contratar o desenvolvedor

Você precisará de um **desenvolvedor full-stack** (alguém que faz tanto o frontend quanto o backend). Procure por:
- Plataformas: **Workana**, **GetNinjas**, **LinkedIn**, **99freelas**
- Perfil: "Desenvolvedor React + Node.js com experiência em sistemas ERP/PDV"
- Peça referências e um portfólio de sistemas similares
- Compartilhe este documento para o desenvolvedor estimar o projeto

**Estimativa de custo (Brasil, 2026):**
- MVP (3 meses): R$ 15.000 a R$ 40.000 (freelancer) ou R$ 5.000/mês (dev CLT)
- Fases completas: R$ 80.000 a R$ 200.000 dependendo da complexidade

### Para usar ferramentas no-code (alternativa sem desenvolvedor)

Se quiser começar mais rápido e mais barato, considere:

| Ferramenta | Para quê | Custo mensal |
|---|---|---|
| **Bubble.io** | Criar o sistema completo no-code | US$ 29-100 |
| **FlutterFlow** | App mobile no-code | US$ 30-70 |
| **Supabase** | Banco de dados gerenciado | Gratuito até certo limite |
| **Make (ex-Integromat)** | Automações entre sistemas | US$ 9-16 |
| **Wati ou Z-API** | WhatsApp API acessível | R$ 150-300 |

> 💡 **Recomendação:** Comece com Bubble.io para o MVP. É possível construir o PDV, cadastro de produtos, estoque e clientes sem saber programar. Quando o negócio crescer, migre para o sistema desenvolvido sob medida.

### O que você mesmo pode fazer

- Configurar o domínio da loja (ex.: sistema.nomedaloha.com.br)
- Criar a conta no WhatsApp Business e solicitar a API
- Contratar o certificado digital A1 para emissão de NF-e (R$ 150-300/ano)
- Cadastrar os produtos, categorias e clientes após o sistema estar pronto
- Configurar regras de comissão e promoções pelo painel administrativo
- Criar templates de mensagem e campanhas

---

## Glossário

| Termo | Definição |
|---|---|
| **SKU** | Stock Keeping Unit. Código único que identifica cada produto (ou variação) no estoque |
| **PDV** | Ponto de Venda. Interface usada pelo vendedor para registrar vendas no balcão |
| **NFC-e** | Nota Fiscal do Consumidor Eletrônica. Emitida para vendas ao consumidor final |
| **NF-e** | Nota Fiscal Eletrônica. Emitida para vendas entre empresas |
| **CMV** | Custo das Mercadorias Vendidas. Total gasto na compra dos produtos que foram vendidos |
| **DRE** | Demonstrativo de Resultado do Exercício. Relatório que mostra lucro ou prejuízo |
| **Ticket Médio** | Valor médio de cada venda. Calculado: receita total ÷ número de vendas |
| **Giro de Estoque** | Velocidade com que o produto é vendido. Alto giro = vende rápido |
| **Margem Bruta** | Diferença entre preço de venda e custo do produto, em % |
| **LGPD** | Lei Geral de Proteção de Dados. Obriga cuidado no uso de dados pessoais dos clientes |
| **API** | Interface de programação. Permite que sistemas diferentes conversem entre si |
| **CEP** | Código de Endereçamento Postal. Usado para busca automática de endereço |
| **CFOP** | Código Fiscal de Operações. Classifica o tipo de movimentação para fins fiscais |
| **CSOSN/CST** | Código de situação tributária usado na emissão de notas fiscais |
| **Open Finance** | Sistema do Banco Central que permite integração com dados bancários do seu negócio |
| **2FA** | Autenticação de dois fatores. Segunda camada de segurança no login |
| **ROI** | Retorno sobre Investimento. Quanto você ganhou em relação ao que gastou |
| **Opt-out** | Solicitação do cliente para não receber mais comunicações |
| **Kit** | Agrupamento de produtos vendidos como um único item com preço diferenciado |
| **Carnê** | Parcelamento próprio da loja, sem envolver banco ou financeira |
