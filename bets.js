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

export function renderProfile(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const usuario = getUsuarioLogado();
  if (!usuario) {
    container.innerHTML = '<p>Área de perfil. Por favor, <a href="conta.html#login">faça login</a>.</p>';
    return;
  }

  const saldo = getSaldo(usuario) ?? 0;
  const bets = JSON.parse(localStorage.getItem('bets_' + usuario) || '[]');

  container.innerHTML = '';

  const header = document.createElement('div');
  header.innerHTML = `
    <h2>Perfil de ${usuario}</h2>
    <p>Saldo: <strong style="color:var(--cor-verde)">${saldo.toFixed(2)}</strong></p>
    <div style="margin:8px 0"><button id="deposit-demo" class="btn signin-btn">Receber 100KZ demo</button></div>
  `;
  container.appendChild(header);

  const list = document.createElement('div');
  list.innerHTML = `<h3>Minhas Apostas (${bets.length})</h3>`;
  if (bets.length === 0) {
    list.innerHTML += '<p>Nenhuma aposta registrada ainda.</p>';
  } else {
    const ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    ul.style.padding = '0';
    bets.slice().reverse().forEach(b => {
      const li = document.createElement('li');
      const date = new Date(b.time);
      const ret = (b.stake * b.odd).toFixed(2);
      li.style.padding = '8px 0';
      li.innerHTML = `<strong>${b.teams}</strong> — Apostaste: ${b.stake}Kz; Pontos ${b.odd} → Ganhas ${ret}Kz <br/><small style="color:#999">${date.toLocaleString()}</small>`;
      ul.appendChild(li);
    });
    list.appendChild(ul);
  }
  container.appendChild(list);

  document.getElementById('deposit-demo')?.addEventListener('click', () => {
    const novo = +(saldo + 100).toFixed(2);
    setSaldo(usuario, novo);
    showMessage('100KZ adicionados (demo).', 'success');
    renderProfile(containerId);
    updateUserInfo();
  });
}

export function renderPromocoes(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const promos = [
    { titulo: 'Bônus de Boas-vindas', descricao: 'Receba 100% de bônus no seu primeiro depósito até 200Kz.', codigo: 'BEMVINDO' },
    { titulo: 'Cashback 10%', descricao: 'Recupere 10% das perdas em apostas ao vivo toda semana.', codigo: 'CASHBACK10' },
    { titulo: 'Aposta Grátis', descricao: 'Ganhe uma aposta grátis de 50Kz ao se registrar.', codigo: 'FREE50' },
    { titulo: 'Odds Turbinadas', descricao: 'Odds até 50% maiores em partidas selecionadas.', codigo: 'TURBO' },
    { titulo: 'Acumulador Premiado', descricao: 'Bônus adicional em apostas acumuladas com 3+ seleções.', codigo: 'ACCUM3' }
  ];
  
  container.innerHTML = '';
  promos.forEach(promo => {
    const card = document.createElement('div');
    card.style.cssText = 'background:rgba(10,255,130,0.1); border:1px solid #0aff82; border-radius:8px; padding:16px; color:#fff;';
    card.innerHTML = `
      <h3 style="margin:0 0 8px 0; color:var(--cor-verde);">${promo.titulo}</h3>
      <p style="margin:0 0 12px 0; color:#ccc; font-size:14px;">${promo.descricao}</p>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <code style="background:#0f1116; padding:6px 10px; border-radius:4px; font-size:12px; color:#0aff82;">${promo.codigo}</code>
        <button class="btn signin-btn" style="font-size:12px; padding:6px 12px;">Ver Detalhes</button>
      </div>
    `;
    container.appendChild(card);
  });
}

export function renderEstatisticas(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const stats = [
    { categoria: 'Futebol', taxa: '54%', descricao: 'Taxa de acerto nas últimas 100 apostas de futebol.' },
    { categoria: 'Basquetebol', taxa: '62%', descricao: 'Desempenho em apostas de basquetebol profissional.' },
    { categoria: 'Esports', taxa: '48%', descricao: 'Estatísticas de apostas em competições de Esports.' },
    { categoria: 'Tênis', taxa: '58%', descricao: 'Taxa média de apostas em torneios de tênis.' },
    { categoria: 'Cassino', taxa: '50%', descricao: 'Probabilidades equilibradas em jogos de cassino.' }
  ];
  
  container.innerHTML = '';
  
  stats.forEach(stat => {
    const card = document.createElement('div');
    card.style.cssText = 'margin-bottom:16px; background:rgba(15,17,22,0.6); border:1px solid #222; border-radius:8px; padding:16px; color:#fff;';
    
    const taxa = parseFloat(stat.taxa);
    const barColor = taxa >= 55 ? '#0aff82' : taxa >= 50 ? '#ffa500' : '#ff4444';
    
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <h3 style="margin:0; font-size:16px;">${stat.categoria}</h3>
        <span style="color:${barColor}; font-weight:bold; font-size:16px;">${stat.taxa}</span>
      </div>
      <div style="background:#0f1116; border-radius:4px; height:8px; overflow:hidden; margin-bottom:8px;">
        <div style="background:${barColor}; height:100%; width:${taxa}%; transition:all 0.3s ease;"></div>
      </div>
      <p style="margin:0; color:#ccc; font-size:13px;">${stat.descricao}</p>
    `;
    container.appendChild(card);
  });
}
