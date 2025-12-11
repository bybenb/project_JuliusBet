import { autenticar, getUsuarioLogado, setUsuarioLogado, registerUser, logout } from './auth.js';
import { renderMatches, updateUserInfo, showMessage, renderProfile, renderPromocoes, renderEstatisticas, simulateBetResult, resolveAllPendingBets } from './bets.js';
import { getSaldo, setSaldo } from './bets.js';

// Inject FontAwesome CDN for icons (used across pages)
(function injectFontAwesome(){
  if (document.head.querySelector('link[href*="font-awesome"]') || document.head.querySelector('link[href*="fontawesome"]')) return;
  const fa = document.createElement('link');
  fa.rel = 'stylesheet';
  fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
  fa.crossOrigin = 'anonymous';
  document.head.appendChild(fa);
})();

// Renderizar partidas em containers conhecidos
// Expor logout globalmente para links `javascript:logout()` em HTML
window.logout = logout;
document.addEventListener('DOMContentLoaded', () => {
  renderMatches('partidas');
  renderMatches('live-matches');

  // Mobile menu: inject hamburger button and toggle nav
  (function setupMobileMenu(){
    const header = document.querySelector('.header');
    if (!header) return;
    // avoid double-inject
    if (document.querySelector('.hamburger')) return;

    const ham = document.createElement('button');
    ham.className = 'hamburger';
    ham.type = 'button';
    ham.setAttribute('aria-label', 'Abrir menu');
    ham.setAttribute('aria-expanded', 'false');
    // use FontAwesome bars icon
    ham.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i>';

    // Insert hamburger at start of header (before logo)
    header.insertBefore(ham, header.firstChild);

    const nav = header.querySelector('.nav');
    function toggleNav() {
      if (!nav) return;
      const open = nav.classList.toggle('open');
      ham.setAttribute('aria-expanded', open ? 'true' : 'false');
      ham.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    }

    ham.addEventListener('click', (e) => { e.stopPropagation(); toggleNav(); });
    // keyboard support: Enter or Space
    ham.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleNav(); }
    });

    // close menu when clicking outside or on link
    document.addEventListener('click', (ev) => {
      if (!nav) return;
      if (!nav.classList.contains('open')) return;
      if (!header.contains(ev.target)) nav.classList.remove('open');
    }, true);

    nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open');
      ham.setAttribute('aria-expanded', 'false');
      ham.setAttribute('aria-label', 'Abrir menu');
    }));
  })();

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
    if (auth) {
      auth.innerHTML = '';
      const span = document.createElement('span');
      span.style.color = '#0aff82';
      span.style.marginRight = '15px';
      span.textContent = `Olá, ${usuarioLogado}!`;
      const a = document.createElement('a');
      a.href = '#';
      a.className = 'btn login-btn';
      a.id = 'logout-btn-main';
      a.textContent = 'Sair';
      a.addEventListener('click', (e) => { e.preventDefault(); logout(); });
      auth.appendChild(span);
      auth.appendChild(a);
    }
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

  // Se estivermos na página de promoções, renderizar
  if (currentPage === 'promocoes.html') {
    renderPromocoes('promos-container');
  }

  // Se estivermos na página de estatísticas, renderizar
  if (currentPage === 'estatisticas.html') {
    renderEstatisticas('stats-container');
  }

  updateUserInfo();
});
