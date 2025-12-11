import { getUsuarioLogado } from '../auth.js';
import { getSaldo, setSaldo, showMessage } from '../bets.js';

// Aviator with global rounds (synchronized between tabs using localStorage)
// Local tab participates by placing stake and cashing out during a running round.

const GROWTH_BASE = 1.015; // per tick multiplier
const TICK_MS = 80; // tick interval used to model multiplier growth
const SCHEDULE_COUNTDOWN = 8000; // 8s countdown before round starts
const HISTORY_KEY = 'aviator_history';
const ROUND_KEY = 'aviator_round';
const LEADER_KEY = 'aviator_leader';

let currentStake = 0;
let cashedOut = false;
let localTabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2)}`;
let isLeader = false;
let rafId = null;
let planeEl = null;
let bars = [];
let audioCtx = null;
let muted = false;
let prevRoundState = null;

function format(n) { return Number(n).toFixed(2); }

function updateSaldoDisplay() {
  const usuario = getUsuarioLogado();
  const el = document.getElementById('aviator-saldo');
  if (!el) return;
  const s = usuario ? (getSaldo(usuario) ?? 0) : 0;
  el.textContent = format(s) + 'Kz';
}

function setUIStateLocal(state, extra) {
  const place = document.getElementById('aviator-place');
  const start = document.getElementById('aviator-start');
  const cash = document.getElementById('aviator-cashout');
  const status = document.getElementById('aviator-status');
  const mult = document.getElementById('aviator-mult');
  if (!place || !start || !cash || !status || !mult) return;

  if (state === 'idle') {
    place.disabled = false;
    start.disabled = !isLeader; // only leader can force-start
    cash.disabled = true;
    status.textContent = 'Aguardando próxima rodada...';
    mult.textContent = '1.00x';
  } else if (state === 'bet_placed') {
    place.disabled = true;
    start.disabled = !isLeader;
    cash.disabled = true;
    status.textContent = `Aposta de ${currentStake}Kz colocada. Aguarde rodada.`;
  } else if (state === 'running') {
    place.disabled = true;
    start.disabled = true;
    cash.disabled = false;
    status.textContent = 'Rodando — cashout antes do crash!';
  } else if (state === 'crashed') {
    place.disabled = false;
    start.disabled = !isLeader;
    cash.disabled = true;
    status.textContent = 'CRASH! Aposta perdida.';
  } else if (state === 'cashed') {
    place.disabled = false;
    start.disabled = !isLeader;
    cash.disabled = true;
    status.textContent = 'Você fez cashout com sucesso!';
  }
  if (extra && extra.multiplier) {
    mult.textContent = `${format(extra.multiplier)}x`;
    if (extra.crashed) mult.classList.add('crash'); else mult.classList.remove('crash');
  }
}

function generateCrash() {
  const r = Math.random();
  const crash = 1 + Math.pow(r, 2) * 29;
  return Number(crash.toFixed(2));
}

function saveRoundToStorage(obj) {
  localStorage.setItem(ROUND_KEY, JSON.stringify(obj));
}

function appendHistory(roundSummary) {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(roundSummary);
    const trimmed = list.slice(0, 50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    localStorage.setItem(HISTORY_KEY + '_updated_at', String(Date.now()));
  } catch (e) { console.warn('history append fail', e); }
}

function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function computeMultiplierForRound(round, now) {
  if (!round || !round.startedAt) return 1;
  const started = round.startedAt;
  const elapsed = Math.max(0, now - started);
  const ticks = elapsed / TICK_MS;
  const mult = Math.pow(GROWTH_BASE, ticks);
  return Math.min(mult, round.crashAt);
}

function updateUIFromRound(round) {
  const now = Date.now();
  if (!round) {
    setUIStateLocal('idle', {multiplier:1});
    renderNextTimer(null);
    renderHistory();
    return;
  }
  if (round.state === 'scheduled') {
    setUIStateLocal('idle', {multiplier:1});
    renderNextTimer(round.startTime);
  } else if (round.state === 'running') {
    const mult = computeMultiplierForRound(round, now);
    const crashed = now >= (round.crashTime || (round.startedAt + 9999999));
    setUIStateLocal('running', {multiplier: mult, crashed: crashed});
    renderNextTimer(null);
  } else if (round.state === 'ended' || round.state === 'crashed') {
    setUIStateLocal('idle', {multiplier: round.crashAt, crashed: true});
    renderNextTimer(null);
  }
  renderHistory();
}

function renderHistory() {
  const list = readHistory();
  const ul = document.getElementById('aviator-history-list');
  if (!ul) return;
  ul.innerHTML = '';
  list.forEach(r => {
    const li = document.createElement('li');
    const left = document.createElement('div');
    left.textContent = `${r.roundId}`;
    const right = document.createElement('div');
    right.innerHTML = `<span class=\"round-mult\">${format(r.crashAt)}x</span> <span class=\"round-time\">${new Date(r.endedAt).toLocaleTimeString()}</span>`;
    li.appendChild(left);
    li.appendChild(right);
    ul.appendChild(li);
  });
}

function renderNextTimer(startTime) {
  const el = document.getElementById('aviator-next-timer');
  if (!el) return;
  if (!startTime) { el.textContent = '--:--'; return; }
  const diff = Math.max(0, startTime - Date.now());
  const s = Math.ceil(diff / 1000);
  el.textContent = `${s}s`;
}

function startAnimationLoop() {
  function tick() {
    const raw = localStorage.getItem(ROUND_KEY);
    const round = raw ? JSON.parse(raw) : null;
    // detect state transitions
    const newState = round ? round.state : null;
    if (prevRoundState !== newState) {
      // scheduled -> running
      if (prevRoundState === 'scheduled' && newState === 'running') {
        if (!muted) playStartSound();
      }
      // running -> ended/crashed
      if (prevRoundState === 'running' && (newState === 'ended' || newState === 'crashed')) {
        if (!muted) playCrashSound();
      }
      prevRoundState = newState;
    }

    updateUIFromRound(round);
    // update visuals
    try {
      const now = Date.now();
      const mult = computeMultiplierForRound(round, now);
      updateVisuals(mult, round && round.state === 'running' ? false : false);
    } catch (e) { }

    rafId = requestAnimationFrame(tick);
  }
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(tick);
}

function leaderScheduleLoop() {
  const raw = localStorage.getItem(ROUND_KEY);
  const round = raw ? JSON.parse(raw) : null;
  const now = Date.now();
  if (!round || round.state === 'ended' || round.state === 'crashed') {
    const startTime = now + SCHEDULE_COUNTDOWN;
    const crashAt = generateCrash();
    const ticks = Math.log(crashAt) / Math.log(GROWTH_BASE);
    const crashDelay = Math.max(0, Math.round(ticks * TICK_MS));
    const crashTime = startTime + crashDelay;
    const newRound = {
      roundId: `r_${Date.now()}`,
      state: 'scheduled',
      startTime: startTime,
      crashAt: crashAt,
      crashTime: crashTime,
      createdBy: localTabId,
    };
    saveRoundToStorage(newRound);
    setTimeout(() => {
      const runningRound = Object.assign({}, newRound, { state: 'running', startedAt: Date.now() });
      saveRoundToStorage(runningRound);
    }, Math.max(0, startTime - Date.now()));

    setTimeout(() => {
      const finished = Object.assign({}, newRound, { state: 'ended', startedAt: newRound.startTime, endedAt: Date.now() });
      saveRoundToStorage(finished);
      appendHistory({ roundId: newRound.roundId, crashAt: newRound.crashAt, endedAt: Date.now() });
    }, Math.max(0, newRound.crashTime - Date.now()));
  } else if (round.state === 'scheduled') {
    if (now >= round.startTime && (!round.startedAt)) {
      const runningRound = Object.assign({}, round, { state: 'running', startedAt: Date.now() });
      saveRoundToStorage(runningRound);
    }
  }
}

function tryBecomeLeader() {
  try {
    const raw = localStorage.getItem(LEADER_KEY);
    const now = Date.now();
    if (!raw) {
      localStorage.setItem(LEADER_KEY, JSON.stringify({ tabId: localTabId, lastSeen: now }));
      isLeader = true;
      return;
    }
    const obj = JSON.parse(raw);
    if (!obj.lastSeen || now - obj.lastSeen > 6000) {
      localStorage.setItem(LEADER_KEY, JSON.stringify({ tabId: localTabId, lastSeen: now }));
      isLeader = true;
      return;
    }
    isLeader = obj.tabId === localTabId;
  } catch (e) { isLeader = false; }
}

function refreshLeaderStamp() {
  try {
    const raw = localStorage.getItem(LEADER_KEY);
    const now = Date.now();
    if (!raw) {
      localStorage.setItem(LEADER_KEY, JSON.stringify({ tabId: localTabId, lastSeen: now }));
      isLeader = true;
      return;
    }
    const obj = JSON.parse(raw);
    if (obj.tabId === localTabId) {
      obj.lastSeen = now;
      localStorage.setItem(LEADER_KEY, JSON.stringify(obj));
      isLeader = true;
    } else {
      if (now - obj.lastSeen > 6000) {
        localStorage.setItem(LEADER_KEY, JSON.stringify({ tabId: localTabId, lastSeen: now }));
        isLeader = true;
      } else {
        isLeader = false;
      }
    }
  } catch (e) { isLeader = false; }
}

function onStorageEvent(e) {
  if (!e.key) return;
  if (e.key === ROUND_KEY || e.key === HISTORY_KEY || e.key === HISTORY_KEY + '_updated_at') {
    return;
  }
  if (e.key === LEADER_KEY) {
    tryBecomeLeader();
  }
}

function placeStake() {
  const usuario = getUsuarioLogado();
  if (!usuario) { showMessage('Faça login para apostar.', 'error'); setTimeout(() => location.href='conta.html#login',700); return; }
  const inp = document.getElementById('aviator-stake');
  if (!inp) return;
  const v = parseFloat(inp.value);
  if (isNaN(v) || v <= 0) { showMessage('Valor inválido.', 'error'); return; }
  const saldo = getSaldo(usuario) || 0;
  if (v > saldo) { showMessage('Saldo insuficiente.', 'error'); return; }
  const novo = +(saldo - v).toFixed(2);
  setSaldo(usuario, novo);
  currentStake = v;
  cashedOut = false;
  setUIStateLocal('bet_placed');
  updateSaldoDisplay();
  showMessage(`Aposta de ${v}Kz colocada.`, 'success');
}

// --- Visuals & Audio helpers ---
function initVisuals() {
  planeEl = document.getElementById('aviator-plane');
  const barsContainer = document.getElementById('aviator-bars');
  if (!barsContainer) return;
  bars = [];
  // create 12 bars
  for (let i=0;i<12;i++) {
    const b = document.createElement('div');
    b.className = 'bar';
    b.style.height = '6px';
    b.style.opacity = String(0.9 - i*0.03);
    barsContainer.appendChild(b);
    bars.push(b);
  }
  const muteBtn = document.getElementById('aviator-mute');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      muted = !muted;
      muteBtn.textContent = muted ? 'Som off' : 'Mudo';
    });
  }
}

function ensureAudio() {
  if (audioCtx || typeof window === 'undefined') return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) { audioCtx = null; }
}

function playTone(freq, duration = 120, type='sine', vol=0.05) {
  if (muted) return;
  ensureAudio();
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = vol;
  o.connect(g);
  g.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(vol, now + 0.01);
  o.start(now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration/1000);
  o.stop(now + duration/1000 + 0.02);
}

function playStartSound() {
  if (muted) return;
  ensureAudio();
  const seq = [440, 520, 660];
  seq.forEach((f,i) => setTimeout(()=>playTone(f,90,'sine',0.04), i*90));
}

function playCashoutSound() {
  if (muted) return;
  ensureAudio();
  playTone(880, 80, 'sine', 0.04);
  setTimeout(()=>playTone(660, 120, 'sine', 0.03), 90);
}

function playCrashSound() {
  if (muted) return;
  ensureAudio();
  playTone(120, 250, 'sawtooth', 0.08);
}

function updateVisuals(multiplier, crashed) {
  try {
    const max = 30;
    const norm = Math.min(multiplier, max) / max; // 0..1
    if (planeEl) {
      const upPx = Math.round(norm * 110);
      planeEl.style.transform = `translateY(-${upPx}px) rotate(-8deg) scale(${1 + norm*0.08})`;
    }
    // animate bars
    if (bars && bars.length) {
      bars.forEach((b, idx) => {
        // create wave-like variation
        const phase = (idx / bars.length) * Math.PI;
        const h = Math.round(6 + (norm * 100) * (0.4 + 0.6 * Math.abs(Math.sin(Date.now()/400 + phase))));
        b.style.height = `${h}px`;
        // dim when low
        if (norm < 0.06) b.classList.add('dim'); else b.classList.remove('dim');
      });
    }
  } catch (e) { }
}

function computeCurrentRound() {
  const raw = localStorage.getItem(ROUND_KEY);
  return raw ? JSON.parse(raw) : null;
}

function cashout() {
  const round = computeCurrentRound();
  if (!round || round.state !== 'running') { showMessage('Sem rodada em curso.', 'error'); return; }
  if (currentStake <= 0) { showMessage('Sem aposta ativa.', 'error'); return; }
  if (cashedOut) return;
  const now = Date.now();
  const mult = computeMultiplierForRound(round, now);
  const usuario = getUsuarioLogado();
  if (!usuario) { showMessage('Faça login para jogar.', 'error'); return; }
  const payout = +(currentStake * mult).toFixed(2);
  const saldo = getSaldo(usuario) || 0;
  const novo = +(saldo + payout).toFixed(2);
  setSaldo(usuario, novo);
  cashedOut = true;
  setUIStateLocal('cashed', {multiplier: mult});
  showMessage(`CASHOUT! +${payout}Kz (@ ${format(mult)}x)`, 'success');
  currentStake = 0;
  updateSaldoDisplay();
  if (!muted) playCashoutSound();
}

function forceStart() {
  if (!isLeader) { showMessage('Somente o líder pode iniciar uma rodada agora.', 'error'); return; }
  leaderScheduleLoop();
}

function setup() {
  updateSaldoDisplay();
  setUIStateLocal('idle');
  const place = document.getElementById('aviator-place');
  const start = document.getElementById('aviator-start');
  const cash = document.getElementById('aviator-cashout');

  place?.addEventListener('click', placeStake);
  start?.addEventListener('click', forceStart);
  cash?.addEventListener('click', cashout);

  // visuals init
  initVisuals();

  tryBecomeLeader();
  setInterval(() => { refreshLeaderStamp(); }, 2000);
  setInterval(() => { if (isLeader) leaderScheduleLoop(); }, 1000);

  window.addEventListener('storage', onStorageEvent);

  renderHistory();
  startAnimationLoop();
  setInterval(updateSaldoDisplay, 1500);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
else setup();
