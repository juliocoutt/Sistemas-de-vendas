document.addEventListener('DOMContentLoaded', () => {
  // Carregar Configurações Dinâmicas (Logo e Banner)
  fetch('/api/configuracoes')
    .then(r => r.json())
    .then(config => {
      if (config.logo_sistema) {
        const logoText = document.getElementById('logoText');
        if (logoText) logoText.textContent = config.logo_sistema;
      }
      if (config.banner_login) {
        const loginLeft = document.getElementById('loginLeft');
        if (loginLeft) {
          loginLeft.style.backgroundImage = `url('${config.banner_login}')`;
        }
      }
    })
    .catch(err => console.error('Erro ao carregar configurações dinâmicas:', err));

  // Se já estiver logado, redirecionar para o admin
  if (sessionStorage.getItem('usuario')) {
    window.location.href = 'admin.html';
  }

  const formLogin = document.getElementById('formLogin');
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('username').value.trim();
      const senha = document.getElementById('password').value.trim();
      const btn = document.getElementById('btnLogin');
      const errBox = document.getElementById('loginError');
      
      errBox.classList.remove('show');
      btn.disabled = true;
      btn.textContent = 'Aguarde...';
      
      try {
        const resp = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, senha })
        });
        
        const json = await resp.json();
        
        if (!resp.ok) {
          throw new Error(json.error || 'Erro ao realizar login.');
        }
        
        // Sucesso
        sessionStorage.setItem('usuario', JSON.stringify(json));
        window.location.href = 'admin.html';
        
      } catch (err) {
        errBox.textContent = err.message;
        errBox.classList.add('show');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Entrar';
      }
    });
  }
});
