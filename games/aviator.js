import { getUsuarioLogado } from '../auth.js';
import { getSaldo, setSaldo, showMessage } from '../bets.js';

// Simple Aviator demo: multiplier increases until crash; player must cashout before crash.
let running = false;
let multiplier = 1;
let crashAt = 0;
let intervalId = null;
let currentStake = 0;
let cashedOut = false;

function format(n) { return Number(n).toFixed(2); }

function updateSaldoDisplay() {
  const usuario = getUsuarioLogado();
  const el = document.getElementById('aviator-saldo');
  if (!el) return;
  const s = usuario ? (getSaldo(usuario) ?? 0) : 0;
  el.textContent = format(s) + 'Kz';
}

function setUIState(state) {
  const place = document.getElementById('aviator-place');
  const start = document.getElementById('aviator-start');
  const cash = document.getElementById('aviator-cashout');
  const status = document.getElementById('aviator-status');
  const mult = document.getElementById('aviator-mult');

  if (!place || !start || !cash || !status || !mult) return;

  if (state === 'idle') {
    place.disabled = false;
    start.disabled = false;
    cash.disabled = true;
    status.textContent = 'Aguardando aposta...';
    mult.textContent = '1.00x';
  } else if (state === 'bet_placed') {
    place.disabled = true;
    start.disabled = false;
    cash.disabled = true;
    status.textContent = `Aposta de ${currentStake}Kz colocada. Pronto para iniciar.`;
  } else if (state === 'running') {
    place.disabled = true;
    start.disabled = true;
    cash.disabled = false;
    status.textContent = 'Rodando — cashout antes do crash!';
  } else if (state === 'crashed') {
    place.disabled = false;
    start.disabled = false;
    cash.disabled = true;
    status.textContent = 'CRASH! Aposta perdida.';
  } else if (state === 'cashed') {
    place.disabled = false;
    start.disabled = false;
    cash.disabled = true;
    status.textContent = 'Você fez cashout com sucesso!';
  }
}

function generateCrash() {
  // simple random crash between 1.1x and 30x, bias towards lower values
  // use exponential-like distribution
  const r = Math.random();
  const crash = 1 + Math.pow(r, 2) * 29; // 1..30
  return Number(crash.toFixed(2));
}

function startRound() {
  if (running) return;
  if (currentStake <= 0) { showMessage('Coloque uma aposta primeiro.', 'error'); return; }
  const usuario = getUsuarioLogado();
  if (!usuario) { showMessage('Faça login para jogar.', 'error'); setTimeout(() => location.href='conta.html#login',700); return; }

  // ensure user has enough (stake already deducted at place time)
  running = true;
  cashedOut = false;
  multiplier = 1;
  crashAt = generateCrash();
  setUIState('running');

  const multEl = document.getElementById('aviator-mult');
  intervalId = setInterval(() => {
    // increase multiplier exponentially for more realistic feel
    multiplier = +(multiplier * 1.015).toFixed(2);
    if (multEl) multEl.textContent = `${format(multiplier)}x`;
    if (multiplier >= crashAt) {
      // crash
      clearInterval(intervalId);
      running = false;
      if (!cashedOut) {
        // player lost stake already deducted
        setUIState('crashed');
        showMessage('CRASH! Você perdeu a aposta.', 'error');
      }
      // reset currentStake
      currentStake = 0;
      updateSaldoDisplay();
    }
  }, 80);
}

function cashout() {
  if (!running) return;
  if (cashedOut) return;
  const usuario = getUsuarioLogado();
  if (!usuario) { showMessage('Faça login para jogar.', 'error'); return; }
  // payout
  const payout = +(currentStake * multiplier).toFixed(2);
  const saldo = getSaldo(usuario) || 0;
  const novo = +(saldo + payout).toFixed(2);
  setSaldo(usuario, novo);
  cashedOut = true;
  running = false;
  clearInterval(intervalId);
  setUIState('cashed');
  showMessage(`CASHOUT! +${payout}Kz`, 'success');
  currentStake = 0;
  updateSaldoDisplay();
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
  // deduct immediately for demo
  const novo = +(saldo - v).toFixed(2);
  setSaldo(usuario, novo);
  currentStake = v;
  setUIState('bet_placed');
  updateSaldoDisplay();
  showMessage(`Aposta de ${v}Kz colocada.`, 'success');
}

function setup() {
  updateSaldoDisplay();
  setUIState('idle');
  const place = document.getElementById('aviator-place');
  const start = document.getElementById('aviator-start');
  const cash = document.getElementById('aviator-cashout');

  place?.addEventListener('click', placeStake);
  start?.addEventListener('click', startRound);
  cash?.addEventListener('click', cashout);

  // update saldo periodically
  setInterval(updateSaldoDisplay, 1500);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
else setup();
