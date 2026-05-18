/* api.js — Wrapper para chamadas ao backend */
const API = {
  base: '/api',

  async request(method, path, data) {
    const u = this.getUsuario();
    const opts = {
      method,
      headers: { 
        'Content-Type': 'application/json',
        ...(u ? { 'X-User-Role': u.role } : {})
      },
    };
    if (data) opts.body = JSON.stringify(data);
    const resp = await fetch(this.base + path, opts);
    const json = await resp.json().catch(() => null);
    if (!resp.ok) throw new Error((json && json.error) || `Erro ${resp.status}`);
    return json;
  },

  get(path) {
    let finalPath = path;
    if (window.currentMasterLojaId && !path.includes('/lojas') && !path.includes('/master') && !path.includes('/configuracoes')) {
      const sep = path.includes('?') ? '&' : '?';
      finalPath = `${path}${sep}loja_id=${window.currentMasterLojaId}`;
    }
    return API.request('GET', finalPath);
  },
  post(path, data) {
    let finalData = data;
    if (window.currentMasterLojaId && data && typeof data === 'object' && !data.loja_id && !path.includes('/master')) {
      finalData = { ...data, loja_id: Number(window.currentMasterLojaId) };
    }
    return API.request('POST', path, finalData);
  },
  put:    (path, data) => API.request('PUT',    path, data),
  delete: (path)       => API.request('DELETE', path),

  // Usuário logado (salvo em sessionStorage)
  getUsuario() {
    try { return JSON.parse(sessionStorage.getItem('usuario') || 'null'); }
    catch { return null; }
  },
  setUsuario(u) { sessionStorage.setItem('usuario', JSON.stringify(u)); },
  logout()      { sessionStorage.removeItem('usuario'); location.href = '/'; },
  checkAuth() {
    if (!this.getUsuario()) { location.href = '/'; return false; }
    return true;
  },
};

/* ── Toast notifications ── */
function showToast(msg, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; t.style.transition = '.3s'; setTimeout(() => t.remove(), 300); }, duration);
}

/* ── Format helpers ── */
const fmt = {
  brl: (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v),
  date: (s) => {
    const d = new Date(s);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },
};
