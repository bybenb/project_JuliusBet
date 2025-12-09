import { getUsuarioLogado, logout } from './auth.js';
import { jogos } from './data.js';

export function getSaldo(usuario) {
  const v = localStorage.getItem('saldo_' + usuario);
  return v ? parseFloat(v) : null;
}

export function setSaldo(usuario, valor) {
  localStorage.setItem('saldo_' + usuario, String(valor));
}

export function showMessage(msg, type = 'info') {
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
  `;
  if (type === 'success') { div.style.backgroundColor = '#0aff82'; div.style.color = '#000'; }
  else if (type === 'error') div.style.backgroundColor = '#ff4444';
  else div.style.backgroundColor = '#0aff82';
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

// Modal simples para inserir valor da aposta
export function showBetModal(teams, odd, saldo, onConfirm) {
  if (document.getElementById('bet-modal')) return;
  const overlay = document.createElement('div');
  overlay.id = 'bet-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:2000;';
  const box = document.createElement('div');
  box.style.cssText = 'background:#0f1116;padding:18px;border-radius:8px;max-width:360px;width:100%;color:#fff;border:1px solid #222;';
  box.innerHTML = `
    <h3 style="margin:0 0 8px 0">Aposta: ${teams}</h3>
    <p style="margin:0 0 8px 0;color:#ccc">Odd: ${odd} — Saldo: ${saldo}</p>
    <label style="font-size:14px">Valor</label>
    <input id="bet-value" type="number" step="0.01" min="0" value="10" style="width:100%;padding:8px;margin:6px 0;border-radius:6px;border:1px solid #222;background:#0d0f16;color:#fff;" />
    <div style="display:flex;gap:8px;margin-top:8px;justify-content:flex-end;">
      <button id="bet-cancel" class="btn login-btn" style="background:transparent;border:1px solid #0aff82;color:var(--cor-verde);">Cancelar</button>
      <button id="bet-ok" class="btn signin-btn" style="background:var(--cor-verde);color:#000;">Confirmar</button>
    </div>
  `;
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  const cleanup = () => { overlay.remove(); };
  document.getElementById('bet-cancel').addEventListener('click', cleanup);
  document.getElementById('bet-ok').addEventListener('click', () => {
    const raw = parseFloat(document.getElementById('bet-value').value);
    cleanup();
    onConfirm(raw);
  });
}

export function placeBet(teams, odd) {
  const usuario = getUsuarioLogado();
  if (!usuario) { showMessage('Por favor, faça login para apostar.', 'error'); setTimeout(() => location.href = 'conta.html#login', 600); return; }
  let saldo = getSaldo(usuario) || 0;
  showBetModal(teams, odd, saldo, function(stake) {
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
  });
}

export function updateUserInfo() {
  const usuario = getUsuarioLogado();
  const ui = document.getElementById('user-info');
  if (ui) {
    if (usuario) {
      const saldo = getSaldo(usuario) ?? 0;
      const bets = JSON.parse(localStorage.getItem('bets_' + usuario) || '[]');
      ui.innerHTML = `Olá, <strong style="color:var(--cor-verde)">${usuario}</strong> — Saldo: <strong style="color:var(--cor-verde)">${saldo}</strong> — <a href="conta.html">Minha Conta</a> | <a href="javascript:logout()">Sair</a> | <a href="#" id="ver-apostas">Minhas Apostas (${bets.length})</a>`;
      const btn = document.getElementById('ver-apostas');
      if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); alert(JSON.stringify(bets, null, 2)); });
    } else {
      ui.innerHTML = '<a href="conta.html#login" class="btn login-btn">Entrar</a> <a href="conta.html#register" class="btn signin-btn">Registrar</a>';
    }
  }
}

export function renderMatches(containerId) {
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
    card.querySelectorAll('.odd-btn').forEach(btn => { btn.addEventListener('click', () => { const odd = parseFloat(btn.dataset.odd); placeBet(match.teams, odd); }); });
  });
}
