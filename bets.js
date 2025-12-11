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
  // allow icons/html in messages (messages are generated internally)
  div.innerHTML = msg;
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
  box.classList.add('bet-box');
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
    bets.push({ teams, odd, stake, time: Date.now(), status: 'pending', result: null, winnings: 0 });
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
      ui.innerHTML = `Olá, <strong style="color:var(--cor-verde)">${usuario}</strong> — Saldo: <strong style="color:var(--cor-verde)">${saldo}</strong> — <a href="perfil.html">Minha Conta</a> | <a href="#" id="logout-btn-ui">Sair</a> | <a href="perfil.html#historico" id="vver-apostas">Minhas Apostas (${bets.length})</a>`;
      const btn = document.getElementById('ver-apostas');
      if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); alert(JSON.stringify(bets, null, 2)); });
      // attach logout handler for the ui logout link
      const lnk = document.getElementById('logout-btn-ui');
      if (lnk) lnk.addEventListener('click', (e) => { e.preventDefault(); logout(); });
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

// ===== Ao-Vivo: live rendering and odds simulation =====
export function renderLiveMatches(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  // read filters
  const search = document.getElementById('live-search')?.value?.toLowerCase() || '';
  const filter = document.getElementById('live-filter')?.value || '';

  // Build filtered list first (so we can sort/group)
  const filtered = jogos
    .map((match) => ({
      match,
      teams: (match.teams || ''),
      sport: (match.sport || ''),
      slug: (match.teams || '').replace(/[^a-z0-9]/gi, '_').toLowerCase(),
      highestOdd: Math.max(...(match.odds || [0]))
    }))
    .filter(item => {
      if (search && !(item.teams.toLowerCase().includes(search) || item.sport.toLowerCase().includes(search))) return false;
      if (filter && item.sport !== filter) return false;
      return true;
    });

  // read sort/group controls
  const sort = document.getElementById('live-sort')?.value || 'recommended';
  const group = document.getElementById('live-group')?.checked || false;

  // apply sorting
  if (sort === 'highest_odd') {
    filtered.sort((a, b) => b.highestOdd - a.highestOdd);
  } else if (sort === 'teams') {
    filtered.sort((a, b) => a.teams.localeCompare(b.teams));
  } else if (sort === 'favorites') {
    filtered.sort((a, b) => {
      const fa = localStorage.getItem('fav_' + a.slug) === '1' ? 0 : 1;
      const fb = localStorage.getItem('fav_' + b.slug) === '1' ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return b.highestOdd - a.highestOdd;
    });
  } else {
    // recommended: show favorites first, then by highest odd
    filtered.sort((a, b) => {
      const fa = localStorage.getItem('fav_' + a.slug) === '1' ? 0 : 1;
      const fb = localStorage.getItem('fav_' + b.slug) === '1' ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return b.highestOdd - a.highestOdd;
    });
  }

  // Helper to render a single item into container
  function renderItem(item) {
    const match = item.match;
    const teams = item.teams;
    const sport = item.sport;
    const slug = item.slug;
    const favKey = 'fav_' + slug;
    const fav = localStorage.getItem(favKey) === '1';

    const card = document.createElement('div');
    card.className = 'match-card live-card';
    card.dataset.matchId = slug;
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div class="match-title">${teams}</div>
          <div class="match-sport">${sport} <span class="live-badge">AO VIVO</span></div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="fav-btn" data-id="${slug}" aria-label="Favoritar" title="Favoritar">${fav ? '<i class="fa-solid fa-star" style="color:var(--cor-verde)"></i>' : '<i class="fa-regular fa-star" style="color:#ccc"></i>'}</button>
        </div>
      </div>
      <div class="odds" style="margin-top:12px; display:flex; gap:8px;">
        ${match.odds.map((o, idx) => `<button class="odd-btn live-odd" data-match="${slug}" data-idx="${idx}" data-odd="${o}">${o}</button>`).join('')}
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; font-size:12px; color:#aaa;">
        <small class="match-time">Atualizado: agora</small>
        <div>
          <button class="btn login-btn quick-bet" data-match="${slug}">Apostar</button>
        </div>
      </div>
    `;

    container.appendChild(card);
  }

  if (group) {
    // group by sport
    const groups = filtered.reduce((acc, item) => {
      acc[item.sport] = acc[item.sport] || [];
      acc[item.sport].push(item);
      return acc;
    }, {});

    Object.keys(groups).sort().forEach(sportName => {
      const list = groups[sportName];
      const header = document.createElement('div');
      header.className = 'sport-group';
      header.innerHTML = `<h3 style="margin:0 0 8px 0;">${sportName} <small style='color:#aaa;font-weight:400;margin-left:8px'>(${list.length})</small></h3>`;
      container.appendChild(header);
      list.forEach(item => renderItem(item));
    });
  } else {
    filtered.forEach(item => renderItem(item));
  }

  // attach handlers
  container.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.dataset.id;
      const key = 'fav_' + id;
      const isFav = localStorage.getItem(key) === '1';
      if (isFav) { localStorage.removeItem(key); btn.innerHTML = '<i class="fa-regular fa-star" style="color:#ccc"></i>'; }
      else { localStorage.setItem(key, '1'); btn.innerHTML = '<i class="fa-solid fa-star" style="color:var(--cor-verde)"></i>'; }
    });
  });

  // quick bet button - opens modal for the first odd
  container.querySelectorAll('.quick-bet').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const matchId = btn.dataset.match;
      const match = jogos.find(j => j.teams.replace(/[^a-z0-9]/gi, '_').toLowerCase() === matchId);
      if (!match) return;
      // default to first odd
      const odd = parseFloat(match.odds[0]);
      placeBet(match.teams, odd);
    });
  });

  // odd buttons handler
  container.querySelectorAll('.live-odd').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const odd = parseFloat(btn.dataset.odd);
      const matchId = btn.dataset.match;
      const match = jogos.find(j => j.teams.replace(/[^a-z0-9]/gi, '_').toLowerCase() === matchId);
      if (!match) return;
      placeBet(match.teams, odd);
    });
  });
}

export function startLiveOddsSimulation(containerId, interval = 3500) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // periodic update
  const tick = () => {
    // pick 1-2 random matches and change a random odd slightly
    const count = Math.max(1, Math.floor(Math.random() * 2) + 1);
    for (let i=0;i<count;i++) {
      const mi = Math.floor(Math.random() * jogos.length);
      const match = jogos[mi];
      if (!match || !match.odds || match.odds.length === 0) continue;
      const oi = Math.floor(Math.random() * match.odds.length);
      const current = parseFloat(match.odds[oi]);
      const delta = (Math.random() * 0.2) * (Math.random() > 0.5 ? 1 : -1);
      let next = +(Math.max(1, current + delta)).toFixed(2);
      match.odds[oi] = next;

      // update DOM button if present
      const btn = container.querySelector(`button.live-odd[data-match="${match.teams.replace(/[^a-z0-9]/gi, '_').toLowerCase()}"][data-idx="${oi}"]`);
      if (btn) {
        const old = parseFloat(btn.dataset.odd);
        btn.dataset.odd = next;
        btn.textContent = next;
        // animation class
        btn.classList.add(next > old ? 'odd-up' : 'odd-down');
        setTimeout(() => btn.classList.remove('odd-up','odd-down'), 800);
      }
    }
  };

  const id = setInterval(tick, interval);
  // return a function to stop
  return () => clearInterval(id);
}

export function simulateBetResult(usuario, betIndex) {
  const key = 'bets_' + usuario;
  const bets = JSON.parse(localStorage.getItem(key) || '[]');
  
  if (!bets[betIndex] || bets[betIndex].status !== 'pending') return false;
  
  const bet = bets[betIndex];
  const won = Math.random() > 0.5; // 50% chance de ganho
  const winnings = won ? +(bet.stake * bet.odd).toFixed(0) : 0;
  
  bets[betIndex].status = won ? 'won' : 'lost';
  bets[betIndex].result = won ? 'WIN' : 'LOSS';
  bets[betIndex].winnings = winnings;
  bets[betIndex].resolvedAt = Date.now();
  
  // Atualizar saldo se ganhou
  if (won) {
    const saldo = getSaldo(usuario) || 0;
    const novoSaldo = +(saldo + winnings).toFixed(2);
    setSaldo(usuario, novoSaldo);
  }
  
  localStorage.setItem(key, JSON.stringify(bets));
  return true;
}

export function resolveAllPendingBets(usuario) {
  const key = 'bets_' + usuario;
  const bets = JSON.parse(localStorage.getItem(key) || '[]');
  
  const pendingBets = bets.filter(b => b.status === 'pending');
  let resolved = 0;
  let totalWinnings = 0;
  
  pendingBets.forEach((_, idx) => {
    const betIdx = bets.findIndex(b => b === _);
    if (simulateBetResult(usuario, betIdx)) {
      resolved++;
      if (bets[betIdx].status === 'won') {
        totalWinnings += bets[betIdx].winnings;
      }
    }
  });
  
  return { resolved, totalWinnings };
}

export function getBetStatusColor(status) {
  if (status === 'won') return '#0aff82';
  if (status === 'lost') return '#ff4444';
  return '#ffa500';
}

export function getBetStatusIcon(status) {
  if (status === 'won') return '<i class="fa-solid fa-check-circle" aria-hidden="true" style="color:#0aff82;margin-right:6px"></i>';
  if (status === 'lost') return '<i class="fa-solid fa-times-circle" aria-hidden="true" style="color:#ff4444;margin-right:6px"></i>';
  return '<i class="fa-solid fa-hourglass-half" aria-hidden="true" style="color:#ffa500;margin-right:6px"></i>';
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

  // Calcular estatísticas
  const totalApostado = bets.reduce((sum, b) => sum + b.stake, 0);
  const totalGanhosPotenciais = bets.reduce((sum, b) => sum + (b.stake * b.odd), 0);
  const lucroTeórico = totalGanhosPotenciais - totalApostado;
  const taxaAcerto = bets.length > 0 ? Math.floor(Math.random() * 40 + 40) : 0; // Demo: simula taxa entre 40-80%
  const maiorAposta = bets.length > 0 ? Math.max(...bets.map(b => b.stake)) : 0;
  const menorAposta = bets.length > 0 ? Math.min(...bets.map(b => b.stake)) : 0;

  container.innerHTML = '';

  // Header com saldo (usar ícones FontAwesome)
  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom:24px;';
  header.innerHTML = `
    <h2 style="margin:0 0 16px 0;"><i class=\"fa-solid fa-user\" aria-hidden=\"true\" style=\"color:var(--cor-verde);margin-right:8px\"></i>Olá, ${usuario}!</h2>
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:16px;">
      <div style="background:rgba(10,255,130,0.1); border:2px solid var(--cor-verde); border-radius:8px; padding:16px; text-align:center; color:#fff;">
        <p style="margin:0 0 4px 0; color:#aaa; font-size:12px;"><i class=\"fa-solid fa-wallet\" aria-hidden=\"true\" style=\"margin-right:6px\"></i> SALDO ATUAL</p>
        <p style="margin:0; font-size:24px; color:var(--cor-verde); font-weight:bold;">${saldo.toFixed(0)}Kz</p>
      </div>
      <div style="background:rgba(255,165,0,0.1); border:2px solid #ffa500; border-radius:8px; padding:16px; text-align:center; color:#fff;">
        <p style="margin:0 0 4px 0; color:#aaa; font-size:12px;"><i class=\"fa-solid fa-chart-line\" aria-hidden=\"true\" style=\"margin-right:6px\"></i> TOTAL APOSTADO</p>
        <p style="margin:0; font-size:24px; color:#ffa500; font-weight:bold;">${totalApostado.toFixed(0)}Kz</p>
      </div>
      <div style="background:rgba(${lucroTeórico > 0 ? '10,255,130' : '255,68,68'},0.1); border:2px solid ${lucroTeórico > 0 ? 'var(--cor-verde)' : '#ff4444'}; border-radius:8px; padding:16px; text-align:center; color:#fff;">
        <p style="margin:0 0 4px 0; color:#aaa; font-size:12px;"><i class=\"fa-solid fa-bullseye\" aria-hidden=\"true\" style=\"margin-right:6px\"></i> LUCRO POTENCIAL</p>
        <p style="margin:0; font-size:24px; color:${lucroTeórico > 0 ? 'var(--cor-verde)' : '#ff4444'}; font-weight:bold;">${lucroTeórico.toFixed(0)}Kz</p>
      </div>
    </div>
    <button id="deposit-demo" class="btn signin-btn" style="padding:10px 16px; font-size:14px;"><i class=\"fa-solid fa-plus\" aria-hidden=\"true\" style=\"margin-right:6px\"></i>Receber 100Kz Demo</button>
  `;
  container.appendChild(header);

  // Seção de desempenho
  if (bets.length > 0) {
    const statsSection = document.createElement('div');
    statsSection.style.cssText = 'margin-bottom:24px; background:rgba(15,17,22,0.6); border:1px solid #222; border-radius:8px; padding:16px;';
    statsSection.innerHTML = `<h3 style="margin:0 0 16px 0;"><i class=\"fa-solid fa-chart-line\" aria-hidden=\"true\" style=\"margin-right:8px\"></i>Desempenho</h3>`;
    
    const statsGrid = document.createElement('div');
    statsGrid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:12px;';
    
    const stats = [
      { label: '✓ Taxa de Acerto', valor: taxaAcerto + '%', cor: '#0aff82' },
      { label: '<i class="fa-solid fa-list" aria-hidden="true" style="margin-right:6px"></i> Apostas', valor: bets.length, cor: '#ffa500' },
      { label: '<i class="fa-solid fa-coins" aria-hidden="true" style="margin-right:6px"></i> Maior Aposta', valor: maiorAposta + 'Kz', cor: '#00d4ff' },
      { label: '<i class="fa-solid fa-chart-simple" aria-hidden="true" style="margin-right:6px"></i> Menor Aposta', valor: menorAposta + 'Kz', cor: '#ff69b4' }
    ];
    
    stats.forEach(stat => {
      const statCard = document.createElement('div');
      statCard.style.cssText = `background:rgba(255,255,255,0.05); border-left:4px solid ${stat.cor}; border-radius:4px; padding:12px; color:#fff;`;
      statCard.innerHTML = `
        <p style="margin:0 0 4px 0; color:#aaa; font-size:11px; text-transform:uppercase;">${stat.label}</p>
        <p style="margin:0; font-size:20px; color:${stat.cor}; font-weight:bold;">${stat.valor}</p>
      `;
      statsGrid.appendChild(statCard);
    });
    
    statsSection.appendChild(statsGrid);
    container.appendChild(statsSection);

    // Gráfico de distribuição de apostas por valor
    const chartSection = document.createElement('div');
    chartSection.style.cssText = 'margin-bottom:24px; background:rgba(15,17,22,0.6); border:1px solid #222; border-radius:8px; padding:16px;';
    chartSection.innerHTML = `<h3 style="margin:0 0 16px 0;"><i class=\"fa-solid fa-chart-pie\" aria-hidden=\"true\" style=\"margin-right:8px\"></i>Distribuição de Apostas</h3>`;
    
    // Agrupar apostas por range
    const ranges = { '< 10Kz': 0, '10-50Kz': 0, '50-100Kz': 0, '> 100Kz': 0 };
    bets.forEach(b => {
      if (b.stake < 10) ranges['< 10Kz']++;
      else if (b.stake < 50) ranges['10-50Kz']++;
      else if (b.stake < 100) ranges['50-100Kz']++;
      else ranges['> 100Kz']++;
    });
    
    const chartDiv = document.createElement('div');
    chartDiv.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:12px;';
    
    Object.entries(ranges).forEach(([range, count]) => {
      const pct = ((count / bets.length) * 100).toFixed(0);
      const colors = { '< 10Kz': '#0aff82', '10-50Kz': '#ffa500', '50-100Kz': '#00d4ff', '> 100Kz': '#ff69b4' };
      
      const bar = document.createElement('div');
      bar.style.cssText = `background:rgba(255,255,255,0.05); border-radius:4px; padding:12px; text-align:center; color:#fff;`;
      bar.innerHTML = `
        <p style="margin:0 0 8px 0; font-size:12px; color:#aaa;">${range}</p>
        <div style="background:#0f1116; border-radius:4px; height:24px; overflow:hidden; margin-bottom:4px;">
          <div style="background:${colors[range]}; height:100%; width:${pct}%; transition:all 0.3s ease;"></div>
        </div>
        <p style="margin:0; font-size:14px; color:${colors[range]}; font-weight:bold;">${count}</p>
      `;
      chartDiv.appendChild(bar);
    });
    
    chartSection.appendChild(chartDiv);
    container.appendChild(chartSection);
  }

  // Lista de apostas
  const listSection = document.createElement('div');
  listSection.style.cssText = 'background:rgba(15,17,22,0.6); border:1px solid #222; border-radius:8px; padding:16px;';
  
  const pendingCount = bets.filter(b => b.status === 'pending').length;
  listSection.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
    <h3 style="margin:0;"><i class=\"fa-solid fa-clipboard-list\" aria-hidden=\"true\" style=\"margin-right:6px\"></i>Histórico de Apostas (${bets.length})</h3>
    ${pendingCount > 0 ? `<button id="resolve-all-bets" class="btn signin-btn" style="padding:6px 12px; font-size:12px;"><i class=\"fa-solid fa-dice\" aria-hidden=\"true\" style=\"margin-right:6px\"></i>Resolver ${pendingCount} Apostas</button>` : ''}
  </div>`;
  
  if (bets.length === 0) {
    listSection.innerHTML += '<p style="color:#aaa;">Nenhuma aposta registrada ainda. Comece a apostar! <i class="fa-solid fa-bullseye" aria-hidden="true"></i></p>';
  } else {
    const ul = document.createElement('ul');
    ul.style.cssText = 'list-style:none; padding:0; margin:0;';
    
    bets.slice().reverse().forEach((b, originalIdx) => {
      const li = document.createElement('li');
      const date = new Date(b.time);
      const ret = (b.stake * b.odd).toFixed(0);
      const statusColor = getBetStatusColor(b.status);
      const statusIcon = getBetStatusIcon(b.status);
      const resolvedText = b.status !== 'pending' ? `Resultado: <strong style="color:${statusColor};">${statusIcon} ${b.result}</strong> — Ganho: <strong style="color:${statusColor};">${b.winnings}Kz</strong>` : `<button class="resolve-btn" data-idx="${originalIdx}" style="background:${statusColor}; color:#000; border:none; border-radius:4px; padding:4px 10px; cursor:pointer; font-size:11px; font-weight:bold;"><i class="fa-solid fa-dice" aria-hidden="true" style="margin-right:6px"></i>Resolver</button>`;
      
      li.style.cssText = 'padding:12px; margin-bottom:8px; border-left:4px solid ' + statusColor + '; background:rgba(255,255,255,0.02); border-radius:4px; color:#fff;';
      li.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong style="color:var(--cor-verde);">${b.teams}</strong>
          <span style="color:#ffa500; font-weight:bold;">@${b.odd}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#aaa; margin-bottom:8px;">
          <span>Aposta: <strong style="color:#fff;">${b.stake}Kz</strong></span>
          <span>Retorno potencial: <strong style="color:#0aff82;">${ret}Kz</strong></span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px;">
          <small style="color:#666;">${date.toLocaleString()}</small>
          <div>${resolvedText}</div>
        </div>
      `;
      ul.appendChild(li);
    });
    
    listSection.appendChild(ul);
  }
  container.appendChild(listSection);

  // Handlers para resolver apostas
  document.getElementById('resolve-all-bets')?.addEventListener('click', () => {
    const result = resolveAllPendingBets(usuario);
    showMessage(`<i class="fa-solid fa-dice" aria-hidden="true" style="margin-right:6px"></i> ${result.resolved} aposta(s) resolvida(s)! Ganhos: +${result.totalWinnings}Kz`, 'success');
    renderProfile(containerId);
    updateUserInfo();
  });

  container.addEventListener('click', (e) => {
    if (e.target.classList.contains('resolve-btn')) {
      const betIdx = parseInt(e.target.dataset.idx);
      simulateBetResult(usuario, betIdx);
      const bets = JSON.parse(localStorage.getItem('bets_' + usuario) || '[]');
      const bet = bets[betIdx];
      const msg = bet.status === 'won' 
        ? `<i class="fa-solid fa-check-circle" aria-hidden="true" style="margin-right:6px;color:#0aff82"></i> Aposta Ganha! +${bet.winnings}Kz` 
        : `<i class="fa-solid fa-times-circle" aria-hidden="true" style="margin-right:6px;color:#ff4444"></i> Aposta Perdida! -${bet.stake}Kz`;
      showMessage(msg, bet.status === 'won' ? 'success' : 'error');
      renderProfile(containerId);
      updateUserInfo();
    }
  });

  document.getElementById('deposit-demo')?.addEventListener('click', () => {
    const novo = +(saldo + 100).toFixed(2);
    setSaldo(usuario, novo);
    showMessage('100Kz adicionados (demo).', 'success');
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
