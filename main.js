import { autenticar, getUsuarioLogado, setUsuarioLogado, registerUser, logout } from './auth.js';
import { renderMatches, updateUserInfo, showMessage } from './bets.js';
import { getSaldo, setSaldo } from './bets.js';

// Renderizar partidas em containers conhecidos
// Expor logout globalmente para links `javascript:logout()` em HTML
window.logout = logout;
document.addEventListener('DOMContentLoaded', () => {
  renderMatches('partidas');
  renderMatches('live-matches');

  // Login handler
  const loginForm = document.querySelector('form[data-form="login"]');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const usuario = document.getElementById('u')?.value || '';
      const senha = document.getElementById('p')?.value || '';
      if (autenticar(usuario, senha)) {
        setUsuarioLogado(usuario);
        if (getSaldo(usuario) === null) setSaldo(usuario, 1000);
        showMessage(`Bem-vindo, ${usuario}!`, 'success');
        setTimeout(() => { updateUserInfo(); location.href = 'ao-vivo.html'; }, 800);
      } else showMessage('Usuário ou senha incorretos.', 'error');
    });
  }

  // Register handler
  const registerForm = document.querySelector('form[data-form="register"]');
  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = document.getElementById('rn')?.value || '';
      const senha = document.getElementById('rp')?.value || '';
      if (!nome || !senha) { showMessage('Preencha todos os campos.', 'error'); return; }
      registerUser(nome, senha);
      setUsuarioLogado(nome);
      setSaldo(nome, 1000);
      showMessage(`Conta criada e logado como ${nome}.`, 'success');
      setTimeout(() => { updateUserInfo(); location.href = 'ao-vivo.html'; }, 900);
    });
  }

  // Ajustar header auth
  const usuarioLogado = getUsuarioLogado();
  if (usuarioLogado) {
    const auth = document.querySelector('.auth');
    if (auth) auth.innerHTML = `<span style="color: #0aff82; margin-right: 15px;">Olá, ${usuarioLogado}!</span><a href="javascript:logout();" class="btn login-btn">Sair</a>`;
    // injetar links restritos na nav
    const nav = document.querySelector('.nav');
    if (nav && !nav.querySelector('.restricted-links')) {
      const span = document.createElement('span');
      span.className = 'restricted-links';
      span.innerHTML = ` <a href="promocoes.html">Promoções</a> <a href="estatisticas.html">Estatísticas</a> <a href="perfil.html">Perfil</a>`;
      nav.appendChild(span);
    }
  }

  // Proteger páginas restritas
  const currentPage = window.location.pathname.split('/').pop();
  if (['promocoes.html','estatisticas.html'].includes(currentPage) && !getUsuarioLogado()) {
    showMessage('Área restrita: faça login.', 'error');
    setTimeout(() => location.href = 'conta.html#login', 700);
    return;
  }

  // Se estivermos na página de perfil, renderizar o conteúdo
  if (currentPage === 'perfil.html') {
    import('./bets.js').then(mod => {
      mod.renderProfile('profile-container');
    }).catch(err => console.error(err));
  }

  updateUserInfo();
});
