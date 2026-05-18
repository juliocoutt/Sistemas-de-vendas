/* pdv.js — Lógica do PDV (carrinho, busca, checkout) */

let todosProdutos = [];
let carrinho = [];
let formaPag  = 'dinheiro';
let usuario   = null;
let cupomAtivo = null;
let descontoAplicado = 0;

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
  if (!API.checkAuth()) return;
  usuario = API.getUsuario();
  document.getElementById('pdvVendedor').textContent = `👤 ${usuario.nome}`;
  await carregarVendedores();
  await carregarClientes();
  await carregarProdutos();
});

let clientesLista = [];
let clienteSelecionado = null;
let usarPontosNaVenda = false;
let pontosDisponiveis = 0;

async function carregarVendedores() {
  try {
    const vendedores = await API.get('/vendedores');
    const select = document.getElementById('pdvVendedorSelect');
    if (!select) return;
    select.innerHTML = vendedores.map(v => `<option value="${v.id}" ${v.id === usuario.id ? 'selected' : ''}>${v.nome}</option>`).join('');
  } catch (e) {
    console.error('Erro ao carregar vendedores', e);
  }
}

async function carregarClientes() {
  try {
    clientesLista = await API.get('/clientes');
    const select = document.getElementById('pdvClienteSelect');
    if (!select) return;
    const options = clientesLista.map(c => `<option value="${c.id}">${c.nome} (CPF: ${c.cpf_cnpj || 'N/D'})</option>`).join('');
    select.innerHTML = `<option value="">Consumidor não identificado</option>` + options;
  } catch (e) { console.error('Erro ao carregar clientes', e); }
}

function aoSelecionarCliente() {
  const id = document.getElementById('pdvClienteSelect').value;
  usarPontosNaVenda = false;
  
  if (id) {
    clienteSelecionado = clientesLista.find(c => c.id == id);
    pontosDisponiveis = clienteSelecionado?.pontos || 0;
    document.getElementById('pontosContainer').style.display = 'flex';
    document.getElementById('clientePontosSaldo').textContent = pontosDisponiveis;
    document.getElementById('btnUsarPontos').disabled = pontosDisponiveis < 100; // min 100 pts
    document.getElementById('btnUsarPontos').innerHTML = 'Resgatar';
    
    // Auto-preencher endereço se delivery
    if(clienteSelecionado?.endereco) document.getElementById('pdvEndEntrega').value = clienteSelecionado.endereco;
  } else {
    clienteSelecionado = null;
    pontosDisponiveis = 0;
    document.getElementById('pontosContainer').style.display = 'none';
    document.getElementById('pdvEndEntrega').value = '';
  }
  renderizarCarrinho();
}

function toggleDelivery() {
  const isDelivery = document.getElementById('pdvDelivery').checked;
  document.getElementById('deliveryContainer').style.display = isDelivery ? 'flex' : 'none';
  if(!isDelivery) document.getElementById('pdvTaxaEntrega').value = '0.00';
  renderizarCarrinho();
}

function usarPontos() {
  if (pontosDisponiveis < 100) return;
  usarPontosNaVenda = !usarPontosNaVenda;
  document.getElementById('btnUsarPontos').innerHTML = usarPontosNaVenda ? 'Cancelar' : 'Resgatar';
  renderizarCarrinho();
}

// ── Carregar produtos e Kits ──
async function carregarProdutos() {
  try {
    const prods = await API.get('/produtos?ativo=1');
    const kits = await API.get('/kits');
    
    // Transforma kits em produtos virtuais para o PDV
    const kitsVirtuais = kits.map(k => ({
      _uid: 'K' + k.id,
      id: k.id,
      sku: k.sku,
      nome: `🎁 ${k.nome}`,
      categoria: 'Kits',
      preco_venda: k.preco_venda,
      estoque_atual: 999, // kit é composto
      is_kit: true
    }));

    const prodsReal = prods.map(p => ({ ...p, _uid: 'P' + p.id, is_kit: false }));

    todosProdutos = [...kitsVirtuais, ...prodsReal];
    renderizarCategorias();
    renderizarProdutos(todosProdutos);
  } catch (e) {
    document.getElementById('productsGrid').innerHTML =
      `<div class="empty-state"><div class="es-icon">⚠️</div><p>Erro ao carregar produtos/kits.</p></div>`;
  }
}

function renderizarCategorias() {
  const cats = [...new Set(todosProdutos.map(p => p.categoria).filter(Boolean))];
  const bar = document.getElementById('filterCats');
  bar.innerHTML = '';
  const all = document.createElement('div');
  all.className = 'chip active'; all.textContent = 'Todos';
  all.onclick = () => { document.querySelectorAll('#filterCats .chip').forEach(c => c.classList.remove('active')); all.classList.add('active'); filtrarProdutos(document.getElementById('searchInput').value); };
  bar.appendChild(all);
  cats.forEach(cat => {
    const c = document.createElement('div');
    c.className = 'chip'; c.textContent = cat;
    c.onclick = () => {
      document.querySelectorAll('#filterCats .chip').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      const q = document.getElementById('searchInput').value.trim().toLowerCase();
      renderizarProdutos(todosProdutos.filter(p => p.categoria === cat && (!q || p.nome.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))));
    };
    bar.appendChild(c);
  });
}

function filtrarProdutos(q) {
  const catAtiva = document.querySelector('#filterCats .chip.active');
  const cat = catAtiva && catAtiva.textContent !== 'Todos' ? catAtiva.textContent : null;
  const lower = q.trim().toLowerCase();
  const filtered = todosProdutos.filter(p => {
    const matchCat = !cat || p.categoria === cat;
    const matchQ   = !lower || p.nome.toLowerCase().includes(lower) || (p.sku || '').toLowerCase().includes(lower) || (p.categoria || '').toLowerCase().includes(lower);
    return matchCat && matchQ;
  });
  renderizarProdutos(filtered);
}

function renderizarProdutos(lista) {
  const grid = document.getElementById('productsGrid');
  if (!lista.length) {
    grid.innerHTML = `<div class="empty-state"><div class="es-icon">🔍</div><p>Nenhum produto encontrado.</p></div>`;
    return;
  }
  grid.innerHTML = lista.map((p, i) => `
    <div class="product-card" style="animation-delay:${i * 0.03}s" onclick="adicionarAoCarrinho('${p._uid}')">
      <div class="p-name">${p.nome}</div>
      <div class="p-price">${fmt.brl(p.preco_venda)}</div>
      <div class="p-stock">${p.estoque_atual > 0 ? (p.is_kit ? 'Kit/Combo' : `Estoque: ${p.estoque_atual}`) : '<span style="color:var(--danger)">Sem estoque</span>'}</div>
      ${p.categoria ? `<div style="margin-top:.35rem;"><span class="badge badge-gray">${p.categoria}</span></div>` : ''}
    </div>
  `).join('');
}

// ── Carrinho ──
function adicionarAoCarrinho(uid) {
  const prod = todosProdutos.find(p => p._uid === uid);
  if (!prod) return;
  if (prod.estoque_atual <= 0) { showToast('Produto sem estoque!', 'error'); return; }

  const existente = carrinho.find(c => c._uid === uid);
  if (existente) {
    if (existente.quantidade >= prod.estoque_atual) { showToast('Estoque insuficiente!', 'error'); return; }
    existente.quantidade++;
  } else {
    carrinho.push({ _uid: uid, produto_id: prod.id, nome: prod.nome, preco: prod.preco_venda, quantidade: 1, estoque: prod.estoque_atual, is_kit: prod.is_kit });
  }
  renderizarCarrinho();
  showToast(`${prod.nome} adicionado`, 'success', 1500);
}

function alterarQtd(uid, delta) {
  const item = carrinho.find(c => c._uid === uid);
  if (!item) return;
  item.quantidade += delta;
  if (item.quantidade <= 0) carrinho = carrinho.filter(c => c._uid !== uid);
  if (item.quantidade > item.estoque) { item.quantidade = item.estoque; showToast('Limite de estoque atingido.', 'error'); }
  renderizarCarrinho();
}

function removerItem(uid) {
  carrinho = carrinho.filter(c => c._uid !== uid);
  renderizarCarrinho();
}

function limparCarrinho() {
  carrinho = [];
  removerCupom();
  renderizarCarrinho();
}

// ── Cupom ──
async function aplicarCupom() {
  const codigo = document.getElementById('cupomInput').value.trim();
  if (!codigo) { removerCupom(); return; }
  try {
    const camp = await API.get(`/campanhas/validar/${codigo}`);
    cupomAtivo = camp;
    showToast('Cupom aplicado!', 'success');
    renderizarCarrinho();
  } catch(e) {
    showToast(e.message, 'error');
    removerCupom();
  }
}

function removerCupom() {
  cupomAtivo = null;
  descontoAplicado = 0;
  if(document.getElementById('cupomInput')) document.getElementById('cupomInput').value = '';
  renderizarCarrinho();
}

function renderizarCarrinho() {
  const container = document.getElementById('cartItems');
  const emptyEl   = document.getElementById('cartEmpty');
  const totalEl   = document.getElementById('cartTotal');
  const btnFin    = document.getElementById('btnFinalizar');

  if (!carrinho.length) {
    container.innerHTML = '';
    container.appendChild(Object.assign(document.createElement('div'), { className: 'empty-state', innerHTML: '<div class="es-icon">🛒</div><p>Nenhum item ainda</p>' }));
    totalEl.textContent = 'R$ 0,00';
    btnFin.disabled = true;
    return;
  }

  const subtotal = carrinho.reduce((s, c) => s + c.preco * c.quantidade, 0);

  container.innerHTML = carrinho.map(item => `
    <div class="cart-item">
      <div class="cart-item-name">${item.nome}</div>
      <div class="cart-qty-ctrl">
        <button class="qty-btn" onclick="alterarQtd('${item._uid}', -1)">−</button>
        <span class="qty-value">${item.quantidade}</span>
        <button class="qty-btn" onclick="alterarQtd('${item._uid}', 1)">+</button>
      </div>
      <div class="cart-item-price">${fmt.brl(item.preco * item.quantidade)}</div>
      <button class="cart-remove" onclick="removerItem('${item._uid}')" title="Remover">✕</button>
    </div>
  `).join('');

  descontoAplicado = 0;
  if (cupomAtivo && subtotal > 0) {
    if (cupomAtivo.tipo_desconto === 'percentual') {
      descontoAplicado = subtotal * (cupomAtivo.valor_desconto / 100);
    } else {
      descontoAplicado = cupomAtivo.valor_desconto;
    }
    if (descontoAplicado > subtotal) descontoAplicado = subtotal;
    
    document.getElementById('cupomRow').style.display = 'flex';
    document.getElementById('cupomLabel').textContent = `Cupom (${cupomAtivo.codigo_cupom})`;
    document.getElementById('cartDesconto').textContent = `- ${fmt.brl(descontoAplicado)}`;
  } else {
    document.getElementById('cupomRow').style.display = 'none';
  }

  // Pontos de Fidelidade e Delivery
  let descontoPontos = 0;
  const saldoEl = document.getElementById('clientePontosSaldo');
  if (usarPontosNaVenda && clienteSelecionado && pontosDisponiveis >= 100) {
    descontoPontos = pontosDisponiveis * 0.05;
    if (descontoPontos > subtotal - descontoAplicado) descontoPontos = subtotal - descontoAplicado;
    if (saldoEl) saldoEl.innerHTML = `-${pontosDisponiveis} pt (Desconto ${fmt.brl(descontoPontos)})`;
  } else {
    if (saldoEl && clienteSelecionado) saldoEl.textContent = pontosDisponiveis;
  }

  const taxaEntrega = parseFloat(document.getElementById('pdvTaxaEntrega')?.value) || 0;
  const total = subtotal - descontoAplicado - descontoPontos + taxaEntrega;

  document.getElementById('cartSubtotal').textContent = fmt.brl(subtotal) + (taxaEntrega > 0 ? ` + Frete ${fmt.brl(taxaEntrega)}` : '');
  document.getElementById('cartTotal').textContent = fmt.brl(total);
  btnFin.disabled = false;
  calcTroco(total);
}

// ── Pagamento ──
function selectPag(tipo, el) {
  formaPag = tipo;
  document.querySelectorAll('.pay-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const trocoSec = document.getElementById('trocoSection');
  trocoSec.style.display = tipo === 'dinheiro' ? 'block' : 'none';
}

function calcTroco(totalOverride) {
  if (formaPag !== 'dinheiro') return;
  
  const subtotal = carrinho.reduce((s, c) => s + c.preco * c.quantidade, 0);
  let descPts = 0;
  if (usarPontosNaVenda && pontosDisponiveis >= 100) descPts = pontosDisponiveis * 0.05;
  const taxaEntrega = parseFloat(document.getElementById('pdvTaxaEntrega')?.value) || 0;
  
  const total = totalOverride !== undefined ? totalOverride : Math.max(0, subtotal - descontoAplicado - descPts) + taxaEntrega;
  
  const rec   = parseFloat(document.getElementById('valorRecebido').value) || 0;
  const info  = document.getElementById('trocoInfo');
  if (rec >= total) {
    info.textContent = `Troco: ${fmt.brl(rec - total)}`;
    info.style.color = 'var(--success)';
  } else if (rec > 0) {
    info.textContent = `Faltam: ${fmt.brl(total - rec)}`;
    info.style.color = 'var(--danger)';
  } else {
    info.textContent = '';
  }
}

// ── Finalizar Venda ──
async function finalizarVenda() {
  if (!carrinho.length) return;
  const btn = document.getElementById('btnFinalizar');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Processando...';

  try {
    const subtotal = carrinho.reduce((s, c) => s + c.preco * c.quantidade, 0);
    const resp  = await API.post('/vendas', {
      loja_id:        usuario.loja_id || 1,
      usuario_id:     usuario.id,
      vendedor_id:    document.getElementById('pdvVendedorSelect')?.value || usuario.id,
      forma_pagamento: formaPag,
      desconto:       descontoAplicado,
      campanha_id:    cupomAtivo ? cupomAtivo.id : null,
      cliente_id:     clienteSelecionado ? clienteSelecionado.id : null,
      pontos_usados:  usarPontosNaVenda ? pontosDisponiveis : 0,
      is_delivery:    document.getElementById('pdvDelivery')?.checked || false,
      endereco_entrega: document.getElementById('pdvEndEntrega')?.value || '',
      taxa_entrega:   parseFloat(document.getElementById('pdvTaxaEntrega')?.value) || 0,
      itens: carrinho.map(c => ({ produto_id: c.produto_id, quantidade: c.quantidade, is_kit: c.is_kit })),
    });

    document.getElementById('sucessoInfo').innerHTML =
      `Venda <strong>#${resp.id}</strong> — Total: <strong>${fmt.brl(resp.total)}</strong><br>Forma de pagamento: ${formaPag.charAt(0).toUpperCase() + formaPag.slice(1)}`;

    document.getElementById('modalSucesso').style.display = 'flex';

    // Atualiza estoque local
    carrinho.forEach(c => {
      const p = todosProdutos.find(x => x.id === c.produto_id);
      if (p) p.estoque_atual -= c.quantidade;
    });
    carrinho = [];
    renderizarProdutos(todosProdutos.filter(p => p.ativo));
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '✅ Finalizar Venda';
  }
}

function novaVenda() {
  document.getElementById('modalSucesso').style.display = 'none';
  document.getElementById('btnFinalizar').disabled = false;
  document.getElementById('btnFinalizar').innerHTML = '✅ Finalizar Venda';
  document.getElementById('pdvClienteSelect').value = '';
  if(document.getElementById('pdvDelivery')) {
    document.getElementById('pdvDelivery').checked = false;
    document.getElementById('pdvTaxaEntrega').value = '0.00';
    document.getElementById('pdvEndEntrega').value = '';
  }
  toggleDelivery();
  aoSelecionarCliente();
  carrinho = [];
  removerCupom();
  renderizarCarrinho();
}
