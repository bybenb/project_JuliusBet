// Dados de usuários (carregados de usuarios.json)
let usuariosGlobal = [];

// Carregar usuários do JSON
fetch('usuarios.json')
  .then(response => response.json())
  .then(data => {
    usuariosGlobal = data.usuarios;
    console.log('Usuários carregados:', usuariosGlobal);
  })
  .catch(error => console.error('Erro ao carregar usuarios.json:', error));

// Verificar se há usuário logado no localStorage
function getUsuarioLogado() {
  return localStorage.getItem('usuarioLogado');
}

function setUsuarioLogado(usuario) {
  localStorage.setItem('usuarioLogado', usuario);
}

function logout() {
  localStorage.removeItem('usuarioLogado');
  location.reload();
}

// Autenticar usuário contra JSON
function autenticar(usuario, senha) {
  const user = usuariosGlobal.find(u => u.usuario === usuario && u.senha === senha);
  return user ? true : false;
}

const jogos = [
    {
        teams: "Bastard Munchen vs Munshine City",
        sport: "BlueLock",
        odds: [1.85, 3.20, 1.10]
    },
    {
        teams: "Red Bulls vs Warriors",
        sport: "Basquetebol",
        odds: [2.10, 3.00, 3.80]
    },
    {
        teams: "Bengazai vs Lord Sapiência",
        sport: "FreeStyle-Rap",
        odds: [2.10, 3.00, 3.80]
    }, 
    {
        teams: "Argentina vs Angola",
        sport: "Futebol",
        odds: [1.10, 1.50, 30.80]
    },

    {
        teams: "Golden W. vs Lakers",
        sport: "Basquetebol",
        odds: [2.10, 3.80]
    },
    {
        teams: "Rennes vs PSG",
        sport: "Futebol",
        odds: [1.60, 2.40]
    }
];

function rendeirizarJogos() {
    const container = document.getElementById("partidas");

    jogos.forEach(match => {
        const card = document.createElement("div");
        card.className = "match-card";

        card.innerHTML = `
            <div class="match-title">${match.teams}</div>
            <div class="match-sport">${match.sport}</div>

            <div class="odds">
                ${match.odds.map(o => `
                    <button class="odd-btn"> ${o} pts </button>
                `).join("")}
            </div>
        `;

        container.appendChild(card);
    });
}

// Funções de saldo e apostas
function getSaldo(usuario) {
  const v = localStorage.getItem('saldo_' + usuario);
  return v ? parseFloat(v) : null;
}

function setSaldo(usuario, valor) {
  localStorage.setItem('saldo_' + usuario, String(valor));
}

function placeBet(teams, odd) {
  const usuario = getUsuarioLogado();
  if (!usuario) {
    showMessage('Por favor, faça login para apostar.', 'error');
    setTimeout(() => location.href = 'conta.html#login', 600);
    return;
  }

  let saldo = getSaldo(usuario) || 0;
  const raw = prompt(`Aposta em ${teams} (odd ${odd}). Saldo: ${saldo}. Insira valor:`,'10');
  if (!raw) return;
  const stake = parseFloat(raw);
  if (isNaN(stake) || stake <= 0) { showMessage('Valor inválido.', 'error'); return; }
  if (stake > saldo) { showMessage('Saldo insuficiente.', 'error'); return; }

  saldo = +(saldo - stake).toFixed(2);
  setSaldo(usuario, saldo);

  const key = 'bets_' + usuario;
  const bets = JSON.parse(localStorage.getItem(key) || '[]');
  bets.push({ teams, odd, stake, time: Date.now() });
  localStorage.setItem(key, JSON.stringify(bets));

  updateUserInfo();
  showMessage(`Aposta de ${stake} registrada. Novo saldo: ${saldo}`, 'success');
}

function updateUserInfo() {
  const usuario = getUsuarioLogado();
  const ui = document.getElementById('user-info');
  if (ui) {
    if (usuario) {
      const saldo = getSaldo(usuario) ?? 0;
      const bets = JSON.parse(localStorage.getItem('bets_' + usuario) || '[]');
      ui.innerHTML = `Olá, <strong style="color:var(--cor-verde)">${usuario}</strong> — Saldo: <strong style="color:var(--cor-verde)">${saldo}</strong> — <a href="conta.html">Minha Conta</a> | <a href="javascript:logout()">Sair</a> | <a href="#" id="ver-apostas">Minhas Apostas (${bets.length})</a>`;
      const btn = document.getElementById('ver-apostas');
      if (btn) btn.addEventListener('click', (e) => {
        e.preventDefault();
        alert(JSON.stringify(bets, null, 2));
      });
    } else {
      ui.innerHTML = '<a href="conta.html#login" class="btn login-btn">Entrar</a> <a href="conta.html#register" class="btn signin-btn">Registrar</a>';
    }
  }
}

function renderMatches(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  jogos.forEach(match => {
    const card = document.createElement('div');
    card.className = 'match-card';
    card.innerHTML = `
      <div class="match-title">${match.teams}</div>
      <div class="match-sport">${match.sport}</div>
      <div class="odds">
        ${match.odds.map(o => `<button class="odd-btn" data-odd="${o}">${o}</button>`).join('')}
      </div>
    `;

    container.appendChild(card);

    // attach handlers
    card.querySelectorAll('.odd-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const odd = parseFloat(btn.dataset.odd);
        placeBet(match.teams, odd);
      });
    });
  });
}

// render em possíveis containers
renderMatches('partidas');
renderMatches('live-matches');

// ========== HANDLERS DE AUTENTICAÇÃO ==========

// Aguardar usuários serem carregados antes de registrar handlers
window.addEventListener('load', function() {
  // Handler de Login
  const loginForm = document.querySelector('form[data-form="login"]');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const usuario = document.getElementById('u')?.value || '';
      const senha = document.getElementById('p')?.value || '';
      
      if (autenticar(usuario, senha)) {
        setUsuarioLogado(usuario);
        // garantir saldo inicial didático
        if (getSaldo(usuario) === null) setSaldo(usuario, 1000);
        showMessage(`Bem-vindo, ${usuario}!`, 'success');
        setTimeout(() => { updateUserInfo(); location.href = 'ao-vivo.html'; }, 1500);
      } else {
        showMessage('Usuário ou senha incorretos.', 'error');
      }
    });
  }

  // Handler de Registro
  const registerForm = document.querySelector('form[data-form="register"]');
  if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const nome = document.getElementById('rn')?.value || '';
      const email = document.getElementById('re')?.value || '';
      const senha = document.getElementById('rp')?.value || '';
      
      if (!nome || !email || !senha) {
        showMessage('Preencha todos os campos.', 'error');
        return;
      }
      
      showMessage(`Conta criada com sucesso! Bem-vindo, ${nome}.`, 'success');
      setTimeout(() => {
        document.getElementById('rn').value = '';
        document.getElementById('re').value = '';
        document.getElementById('rp').value = '';
      }, 1500);
    });
  }

  // Mostrar status de login no header
  const usuarioLogado = getUsuarioLogado();
  if (usuarioLogado) {
    const auth = document.querySelector('.auth');
    if (auth) {
      auth.innerHTML = `<span style="color: #0aff82; margin-right: 15px;">Olá, ${usuarioLogado}!</span><a href="javascript:logout();" class="btn login-btn">Sair</a>`;
    }
  }

  // proteger páginas restritas
  const currentPage = window.location.pathname.split('/').pop();
  if (['promocoes.html','estatisticas.html'].includes(currentPage) && !getUsuarioLogado()) {
    showMessage('Área restrita: faça login.', 'error');
    setTimeout(() => location.href = 'conta.html#login', 700);
    return;
  }

  // atualizar UI do usuário (saldo, contagem de apostas)
  updateUserInfo();
});

// Função auxiliar para mostrar mensagens
function showMessage(msg, type = 'info') {
  const div = document.createElement('div');
  div.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 6px;
    color: white;
    font-weight: bold;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  `;
  
  if (type === 'success') {
    div.style.backgroundColor = '#0aff82';
    div.style.color = '#000';
  } else if (type === 'error') {
    div.style.backgroundColor = '#ff4444';
  } else {
    div.style.backgroundColor = '#0aff82';
  }
  
  div.textContent = msg;
  document.body.appendChild(div);
  
  setTimeout(() => div.remove(), 3000);
}
