/* pdv.js — Lógica do PDV (carrinho, pagamentos múltiplos, alçadas, caixa) */

let todosProdutos = [];
let carrinho = [];
let usuario = null;
let cupomAtivo = null;
let descontoAplicado = 0;
let descontoManual = 0;
let caixaIdAberto = null;
let pagamentosArr = [];

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
  if (!API.checkAuth()) return;
  usuario = API.getUsuario();
  document.getElementById('pdvVendedor').textContent = `👤 ${usuario.nome}`;
  
  await verificarCaixa();
  if (!caixaIdAberto) return; // Espera usuário abrir no modal

  await carregarVendedores();
  await carregarClientes();
  await carregarProdutos();
});

let clientesLista = [];
let clienteSelecionado = null;
let usarPontosNaVenda = false;
let pontosDisponiveis = 0;

// ── Caixa ──
async function verificarCaixa() {
  try {
    const caixas = await API.get('/caixas?status=aberto');
    const meuCaixa = caixas.find(c => c.usuario_id === usuario.id);
    if (meuCaixa) {
      caixaIdAberto = meuCaixa.id;
    } else {
      document.getElementById('modalAberturaCaixa').style.display = 'flex';
    }
  } catch (e) {
    console.error('Erro ao verificar caixa:', e);
  }
}

async function abrirCaixa() {
  const sup = parseFloat(document.getElementById('caixaSuprimento').value) || 0;
  try {
    const res = await API.post('/caixas', { loja_id: usuario.loja_id || 1, usuario_id: usuario.id, suprimento: sup });
    caixaIdAberto = res.id;
    document.getElementById('modalAberturaCaixa').style.display = 'none';
    showToast('Caixa aberto com sucesso!', 'success');
    await carregarVendedores();
    await carregarClientes();
    await carregarProdutos();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ── Cadastros Iniciais ──
async function carregarVendedores() {
  try {
    const vendedores = await API.get('/vendedores');
    const select = document.getElementById('pdvVendedorSelect');
    if (!select) return;
    select.innerHTML = vendedores.map(v => `<option value="${v.id}" ${v.id === usuario.id ? 'selected' : ''}>${v.nome}</option>`).join('');
  } catch (e) { console.error(e); }
}

async function carregarClientes() {
  try {
    clientesLista = await API.get('/clientes');
    const select = document.getElementById('pdvClienteSelect');
    if (!select) return;
    const options = clientesLista.map(c => `<option value="${c.id}">${c.nome} (CPF: ${c.cpf_cnpj || 'N/D'})</option>`).join('');
    select.innerHTML = `<option value="">Consumidor não identificado</option>` + options;
  } catch (e) { console.error(e); }
}

function aoSelecionarCliente() {
  const id = document.getElementById('pdvClienteSelect').value;
  usarPontosNaVenda = false;
  
  if (id) {
    clienteSelecionado = clientesLista.find(c => c.id == id);
    pontosDisponiveis = clienteSelecionado?.pontos || 0;
    document.getElementById('pontosContainer').style.display = 'flex';
    document.getElementById('clientePontosSaldo').textContent = pontosDisponiveis;
    document.getElementById('btnUsarPontos').disabled = pontosDisponiveis < 100;
    document.getElementById('btnUsarPontos').innerHTML = 'Resgatar';
    if(clienteSelecionado?.endereco) document.getElementById('pdvEndEntrega').value = clienteSelecionado.endereco;
  } else {
    clienteSelecionado = null;
    pontosDisponiveis = 0;
    document.getElementById('pontosContainer').style.display = 'none';
    document.getElementById('pdvEndEntrega').value = '';
    // Se cliente removido e tinha fiado, remove pag fiado
    pagamentosArr = pagamentosArr.filter(p => p.tipo !== 'fiado');
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
    
    const kitsVirtuais = kits.map(k => ({
      _uid: 'K' + k.id, id: k.id, sku: k.sku, nome: `🎁 ${k.nome}`, categoria: 'Kits',
      preco_venda: k.preco_venda, estoque_atual: 999, is_kit: true
    }));

    const prodsReal = prods.map(p => ({ ...p, _uid: 'P' + p.id, is_kit: false }));

    todosProdutos = [...kitsVirtuais, ...prodsReal];
    renderizarCategorias();
    renderizarProdutos(todosProdutos);
  } catch (e) {
    document.getElementById('productsGrid').innerHTML = `<div class="empty-state"><div class="es-icon">⚠️</div><p>Erro ao carregar produtos/kits.</p></div>`;
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
  if (!lista.length) { grid.innerHTML = `<div class="empty-state"><p>Nenhum produto encontrado.</p></div>`; return; }
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

function removerItem(uid) { carrinho = carrinho.filter(c => c._uid !== uid); renderizarCarrinho(); }
function limparCarrinho() { carrinho = []; removerCupom(); pagamentosArr = []; renderizarCarrinho(); }

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
function removerCupom() { cupomAtivo = null; descontoAplicado = 0; if(document.getElementById('cupomInput')) document.getElementById('cupomInput').value = ''; renderizarCarrinho(); }

let totalAPagar = 0;

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
    totalAPagar = 0;
    renderizarPagamentos();
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

  descontoManual = parseFloat(document.getElementById('descManualInput').value) || 0;

  // Pontos de Fidelidade
  let descontoPontos = 0;
  const saldoEl = document.getElementById('clientePontosSaldo');
  if (usarPontosNaVenda && clienteSelecionado && pontosDisponiveis >= 100) {
    descontoPontos = pontosDisponiveis * 0.05;
    if (descontoPontos > subtotal - descontoAplicado - descontoManual) descontoPontos = subtotal - descontoAplicado - descontoManual;
    if (saldoEl) saldoEl.innerHTML = `-${pontosDisponiveis} pt (Desconto ${fmt.brl(descontoPontos)})`;
  } else {
    if (saldoEl && clienteSelecionado) saldoEl.textContent = pontosDisponiveis;
  }

  const taxaEntrega = parseFloat(document.getElementById('pdvTaxaEntrega')?.value) || 0;
  
  let descontoTotalReal = descontoAplicado + descontoManual + descontoPontos;
  if (descontoTotalReal > subtotal) descontoTotalReal = subtotal;

  totalAPagar = (subtotal - descontoTotalReal) + taxaEntrega;
  
  document.getElementById('cartSubtotal').textContent = fmt.brl(subtotal) + (taxaEntrega > 0 ? ` + Frete ${fmt.brl(taxaEntrega)}` : '');
  document.getElementById('cartTotal').textContent = fmt.brl(totalAPagar);
  
  // Update suggestion in payment input
  const totalPago = pagamentosArr.reduce((s, p) => s + p.valor, 0);
  if (totalAPagar > totalPago) {
      document.getElementById('pagValor').value = (totalAPagar - totalPago).toFixed(2);
  }

  renderizarPagamentos();
}

// ── Pagamentos Múltiplos ──
function adicionarPagamento() {
  const tipo = document.getElementById('pagTipo').value;
  let valor = parseFloat(document.getElementById('pagValor').value);
  
  if (tipo === 'fiado' && !clienteSelecionado) {
    showToast('Para vender a prazo/fiado, selecione um cliente.', 'error');
    return;
  }
  
  if (!valor || valor <= 0) return;
  
  pagamentosArr.push({ id: Date.now(), tipo, valor });
  renderizarCarrinho(); // Vai chamar renderizarPagamentos
}

function removerPagamento(id) {
  pagamentosArr = pagamentosArr.filter(p => p.id !== id);
  renderizarCarrinho();
}

function renderizarPagamentos() {
  const listEl = document.getElementById('paymentList');
  const lblFalta = document.getElementById('lblFaltaPagar');
  const lblTroco = document.getElementById('lblTrocoInfo');
  const btnFin = document.getElementById('btnFinalizar');

  listEl.innerHTML = pagamentosArr.map(p => `
    <div class="payment-item">
      <span>${p.tipo.toUpperCase()}</span>
      <div style="display:flex; gap:1rem; align-items:center;">
        <strong>${fmt.brl(p.valor)}</strong>
        <button class="cart-remove" onclick="removerPagamento(${p.id})">✕</button>
      </div>
    </div>
  `).join('');

  const totalPago = pagamentosArr.reduce((s, p) => s + p.valor, 0);
  
  if (totalPago >= totalAPagar && carrinho.length > 0) {
    lblFalta.textContent = "R$ 0,00";
    lblFalta.style.color = "var(--success)";
    if (totalPago > totalAPagar) {
      lblTroco.style.display = 'inline';
      lblTroco.innerHTML = `Troco: <strong>${fmt.brl(totalPago - totalAPagar)}</strong>`;
    } else {
      lblTroco.style.display = 'none';
    }
    btnFin.disabled = false;
  } else {
    lblFalta.textContent = fmt.brl(totalAPagar - totalPago);
    lblFalta.style.color = "var(--danger)";
    lblTroco.style.display = 'none';
    btnFin.disabled = true;
  }
}

// ── Finalização e Validação de Alçadas ──
async function tentarFinalizarVenda() {
  if (!carrinho.length) return;
  
  const subtotal = carrinho.reduce((s, c) => s + c.preco * c.quantidade, 0);
  const descTotal = descontoAplicado + descontoManual;
  const percDesconto = subtotal > 0 ? (descTotal / subtotal) * 100 : 0;
  
  const alcada = usuario.desconto_alcada !== undefined ? parseFloat(usuario.desconto_alcada) : 10.0;
  
  if (percDesconto > alcada) {
    // Requer aprovação de gestor
    document.getElementById('modalSenhaGestor').style.display = 'flex';
  } else {
    await efetuarFinalizacao();
  }
}

async function validarGestorEFinalizar() {
  const email = document.getElementById('gestorEmail').value;
  const senha = document.getElementById('gestorSenha').value;
  if (!email || !senha) return;
  
  try {
    await API.post('/auth/validate-manager', { email, senha });
    document.getElementById('modalSenhaGestor').style.display = 'none';
    await efetuarFinalizacao();
  } catch(e) {
    showToast(e.message, 'error');
  }
}

async function efetuarFinalizacao() {
  const btn = document.getElementById('btnFinalizar');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Processando...';

  try {
    const mainForma = pagamentosArr.length === 1 ? pagamentosArr[0].tipo : 'multiplo';
    const totalPagoReal = pagamentosArr.reduce((s,p) => s + p.valor, 0);
    // Se troco (somente dinheiro deve dar troco, simplificado)
    const troco = totalPagoReal > totalAPagar ? totalPagoReal - totalAPagar : 0;
    
    // Ajustar pagamentos caso haja troco (remover do pagamento em dinheiro, se houver)
    let pagamentosClean = [...pagamentosArr].map(p => ({...p}));
    if (troco > 0) {
       let din = pagamentosClean.find(p => p.tipo === 'dinheiro');
       if (din) din.valor -= troco;
    }
    
    const resp = await API.post('/vendas', {
      loja_id:        usuario.loja_id || 1,
      usuario_id:     usuario.id,
      caixa_id:       caixaIdAberto,
      vendedor_id:    document.getElementById('pdvVendedorSelect')?.value || usuario.id,
      forma_pagamento: mainForma,
      pagamentos:     pagamentosClean,
      desconto:       descontoAplicado + descontoManual,
      campanha_id:    cupomAtivo ? cupomAtivo.id : null,
      cliente_id:     clienteSelecionado ? clienteSelecionado.id : null,
      pontos_usados:  usarPontosNaVenda ? pontosDisponiveis : 0,
      is_delivery:    document.getElementById('pdvDelivery')?.checked || false,
      endereco_entrega: document.getElementById('pdvEndEntrega')?.value || '',
      taxa_entrega:   parseFloat(document.getElementById('pdvTaxaEntrega')?.value) || 0,
      itens: carrinho.map(c => ({ produto_id: c.produto_id, quantidade: c.quantidade, is_kit: c.is_kit })),
    });

    document.getElementById('sucessoInfo').innerHTML =
      `Venda <strong>#${resp.id}</strong> — Total: <strong>${fmt.brl(resp.total)}</strong><br>
       Pagamento: ${pagamentosClean.map(p => p.tipo).join(', ')}`;
       
    if(troco > 0) {
      document.getElementById('sucessoInfo').innerHTML += `<br><strong style="color:var(--danger)">Troco a devolver: ${fmt.brl(troco)}</strong>`;
    }

    document.getElementById('modalSucesso').style.display = 'flex';

    // Atualiza estoque local
    carrinho.forEach(c => {
      const p = todosProdutos.find(x => x.id === c.produto_id);
      if (p && !c.is_kit) p.estoque_atual -= c.quantidade;
    });
    carrinho = [];
    pagamentosArr = [];
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
  document.getElementById('descManualInput').value = '0.00';
  document.getElementById('gestorEmail').value = '';
  document.getElementById('gestorSenha').value = '';
  
  if(document.getElementById('pdvDelivery')) {
    document.getElementById('pdvDelivery').checked = false;
    document.getElementById('pdvTaxaEntrega').value = '0.00';
    document.getElementById('pdvEndEntrega').value = '';
  }
  toggleDelivery();
  aoSelecionarCliente();
  limparCarrinho();
}
