// ledGame.js — 반짝반짝 라이트쇼 (LED · 디지털 출력)
// [준비] 결선 회로도 → 보드 연결/진단 → 통과 시 [게임] 타이밍 리듬(노트 50개).
// 판정 3종 ↔ LED 3개: PERFECT=초록(D2) · GOOD=주황(D3) · MISS=빨강(D4). 보드 연결 시 실제로 점등.
// EDDIE가 좌우로 반전하며 지휘. 적중 수에 따라 EDDIE 위 등급(D→S)이 실시간 변동.
import { sfx } from '../app/sfx.js';
import { progress } from '../app/progress.js';
import { celebrateRoom } from './celebrate.js';
import { board } from '../app/board.js';

const LEAD = 1450;                     // 마커가 판정선까지 오는 시간(ms)
const W_PERFECT = 90, W_GOOD = 170;    // 판정 윈도우(ms)

// LED 3개: 판정과 매칭 (perfect=초록/D2, good=주황/D3, miss=빨강/D4)
const LEDS = [
  { pin: 2, color: '46,200,106', label: '초록', flash: 0 },
  { pin: 3, color: '255,158,60', label: '주황', flash: 0 },
  { pin: 4, color: '239,77,77', label: '빨강', flash: 0 },
];

const bgImg = new Image(); bgImg.src = '/brand/stage-led-bg.png';
const eddieImg = new Image(); eddieImg.src = '/brand/eddie-conductor.png';
const ready = (im) => im.complete && im.naturalWidth > 0;

function buildBeatmap() {
  const a = []; let t = 1100, gap = 720;
  for (let i = 0; i < 42; i++) { a.push(t); if (i >= 8 && i % 3 === 0) a.push(t + gap * 0.5); gap = Math.max(300, gap - 9); t += gap; }
  return a.sort((x, y) => x - y).slice(0, 50);
}

export function showLedGame(root, { onExit } = {}) {
  const TIMES = buildBeatmap();
  const TOTAL = TIMES.length;          // 50
  const PASS = Math.ceil(TOTAL * 0.7); // 35

  root.innerHTML = `
    <div class="led scene-fade">
      <div class="brand-badge"><span class="brand-dot"></span>Eduino&nbsp;<b>AI</b></div>
      <button class="snd-toggle" id="snd-toggle" title="소리 켜기/끄기">${sfx.muted ? '🔇' : '🔊'}</button>
      <button class="bx-exit" id="led-exit">✕ 나가기</button>
      <div class="world-host" id="led-host"></div>
      <div class="led-hud" id="led-hud" hidden>
        <span class="lh-item">🎯 적중 <b id="lh-hit">0</b>/${TOTAL}</span>
        <span class="lh-item">🔥 콤보 <b id="lh-combo">0</b></span>
        <span class="lh-item">⭐ 점수 <b id="lh-score">0</b></span>
      </div>
      <div class="led-prep" id="led-prep">
        <div class="prep-card">
          <h2>🔌 결선 준비 · 반짝반짝 라이트쇼</h2>
          <p class="prep-sub">이지 커넥트로 LED 3개만 꽂으면 끝! 회로도대로 연결하고 보드를 연결하면 시작돼요.</p>
          <div class="prep-grid">
            <div class="prep-img" id="prep-img"></div>
            <div class="prep-side">
              <table class="prep-table">
                <thead><tr><th>LED</th><th>아두이노 핀</th></tr></thead>
                <tbody>
                  <tr><td>🟢 초록 LED</td><td>D2</td></tr>
                  <tr><td>🟠 주황 LED</td><td>D3</td></tr>
                  <tr><td>🔴 빨강 LED</td><td>D4</td></tr>
                </tbody>
              </table>
              <div class="prep-status" id="prep-status">상태 · 보드 연결을 눌러 시작하세요</div>
            </div>
          </div>
          <div class="prep-actions">
            <button class="prep-btn" id="p-connect">🔌 보드 연결</button>
            <button class="prep-btn" id="p-test" disabled>💡 LED 테스트</button>
            <button class="cel-go" id="p-start" disabled>결선 완료 · 시작 ▶</button>
          </div>
          <button class="prep-skip" id="p-skip">보드 없이 데모로 해볼래요 ▶</button>
        </div>
      </div>
    </div>`;

  const host = root.querySelector('#led-host');
  const canvas = document.createElement('canvas'); canvas.className = 'world-canvas'; host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const snd = root.querySelector('#snd-toggle');
  snd.onclick = () => { const m = sfx.toggle(); snd.textContent = m ? '🔇' : '🔊'; };
  root.querySelector('#led-exit').onclick = () => { cleanup(); onExit?.(); };

  const wImg = new Image();
  wImg.onload = () => { const e = root.querySelector('#prep-img'); e.style.backgroundImage = `url(${wImg.src})`; e.classList.add('has-img'); };
  wImg.src = '/brand/wiring-led.png';

  let W = 0, H = 0;
  function resize() { W = canvas.width = host.clientWidth || window.innerWidth; H = canvas.height = host.clientHeight || 600; }
  resize(); window.addEventListener('resize', resize);

  // ===== 준비 =====
  const pStatus = root.querySelector('#prep-status');
  const bConnect = root.querySelector('#p-connect'), bTest = root.querySelector('#p-test'), bStart = root.querySelector('#p-start');
  function setStatus(t, kind = '') { pStatus.textContent = '상태 · ' + t; pStatus.className = 'prep-status ' + kind; }
  if (!board.isSupported()) setStatus('이 브라우저는 보드 연결 미지원 — 아래 데모로 플레이할 수 있어요', 'warn');
  else board.connectAuto().then((a) => { if (a.ok) onConnected(); }).catch(() => {});
  bConnect.onclick = async () => {
    if (!board.isSupported()) { setStatus('Chrome/Edge 데스크톱에서 열어야 보드를 연결할 수 있어요', 'warn'); return; }
    setStatus('연결 중… 포트를 골라주세요 🔌'); sfx.click();
    try { await board.connect(); onConnected(); } catch (e) { setStatus(board.classify(e).note, 'warn'); }
  };
  function onConnected() { setStatus('보드 연결 완료! ✅ LED 테스트로 결선을 확인하거나 바로 시작하세요', 'ok'); bTest.disabled = false; bStart.disabled = false; bConnect.textContent = '🔌 연결됨 ✓'; }
  bTest.onclick = async () => {
    setStatus('초록·주황·빨강 순서로 깜빡여 볼게요 — 순서대로 켜지면 결선 성공! 💡'); sfx.ok();
    try { for (const l of LEDS) { await board.blink(l.pin, 2, 200); } } catch (e) { setStatus('테스트 실패 — 결선을 다시 확인해주세요', 'warn'); }
  };
  bStart.onclick = beginGame;
  root.querySelector('#p-skip').onclick = beginGame;
  function beginGame() { root.querySelector('#led-prep').classList.add('hide'); root.querySelector('#led-hud').hidden = false; state.phase = 'count'; state.countT = performance.now(); }

  // ===== 게임 =====
  const elScore = root.querySelector('#lh-score'), elCombo = root.querySelector('#lh-combo'), elHit = root.querySelector('#lh-hit');
  const beats = TIMES.map((target, i) => ({ i, target, judged: false }));
  const pops = [];
  const state = { phase: 'prep', t0: 0, countT: 0, score: 0, combo: 0, maxCombo: 0, hits: 0, seen: 0, ended: false };
  const hitX = () => Math.max(160, W * 0.24);

  function flashLed(idx) {
    const l = LEDS[idx]; l.flash = performance.now();
    if (board.connected) { board.digital(l.pin, true).catch(() => {}); setTimeout(() => board.digital(l.pin, false).catch(() => {}), 170); }
  }
  function rankNow() {
    if (state.seen === 0) return 'D';
    const acc = state.hits / state.seen;
    return acc >= 0.95 ? 'S' : acc >= 0.85 ? 'A' : acc >= 0.7 ? 'B' : acc >= 0.5 ? 'C' : 'D';
  }

  function press() {
    if (state.phase !== 'play' || state.ended) return;
    const now = performance.now() - state.t0;
    let best = null, bestD = 1e9;
    for (const b of beats) { if (b.judged) continue; const d = Math.abs(now - b.target); if (d < bestD) { bestD = d; best = b; } }
    if (!best) return;
    if (bestD <= W_GOOD) {
      best.judged = true; state.seen++; const perfect = bestD <= W_PERFECT;
      state.combo++; state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.score += (perfect ? 100 : 60) + state.combo * 5; state.hits++;
      perfect ? (sfx.perfect(), flashLed(0)) : (sfx.ok(), flashLed(1));
      pop(perfect ? 'PERFECT!' : 'GOOD!', perfect ? '46,200,106' : '255,158,60');
    } else if (bestD < 340) { best.judged = true; state.seen++; state.combo = 0; sfx.no(); flashLed(2); pop('MISS', '239,77,77'); }
    sync();
  }
  function pop(text, color) { pops.push({ text, color, y: H * 0.46, life: 55 }); }
  function sync() { elScore.textContent = state.score; elCombo.textContent = state.combo; elHit.textContent = state.hits; }
  function onKey(e) { if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); press(); } }
  window.addEventListener('keydown', onKey);
  canvas.addEventListener('pointerdown', () => { if (state.phase === 'play') press(); });

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (ready(bgImg)) { drawCover(ctx, bgImg, W, H); ctx.fillStyle = 'rgba(14,8,22,0.32)'; ctx.fillRect(0, 0, W, H); }
    else { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3a2140'); g.addColorStop(1, '#1c1230'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

    const nowAbs = performance.now();
    // 상단 3색 LED(판정 매칭)
    const ly = H * 0.13, sp = Math.min(150, W * 0.12);
    for (let i = 0; i < 3; i++) {
      const lx = W / 2 + (i - 1) * sp, on = nowAbs - LEDS[i].flash < 280;
      drawLed(ctx, lx, ly, 26, LEDS[i].color, on, LEDS[i].label);
    }

    if (state.phase === 'count') {
      const el = (nowAbs - state.countT) / 1000, n = 3 - Math.floor(el);
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.font = '900 92px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(n > 0 ? String(n) : 'GO!', W / 2, H * 0.5); ctx.textAlign = 'start';
      if (el >= 3) { state.phase = 'play'; state.t0 = performance.now(); }
    }

    const now = state.phase === 'play' ? nowAbs - state.t0 : -1e9;
    const hx = hitX(), laneY = H * 0.46;
    const pulse = 1 + Math.sin(nowAbs * 0.012) * 0.08;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, laneY, 34 * pulse, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,210,90,0.75)'; ctx.beginPath(); ctx.arc(hx, laneY, 22 * pulse, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, laneY); ctx.lineTo(W, laneY); ctx.stroke();

    for (const b of beats) {
      if (b.judged) continue;
      const dt = b.target - now; if (dt > LEAD || dt < -W_GOOD - 80) continue;
      const x = hx + (dt / LEAD) * (W - hx - 50), near = Math.abs(dt) < W_GOOD;
      ctx.save(); ctx.shadowColor = 'rgba(255,210,90,0.9)'; ctx.shadowBlur = near ? 24 : 10;
      ctx.fillStyle = near ? '#fff0b0' : '#ffd24a'; ctx.beginPath(); ctx.arc(x, laneY, 17, 0, 6.283); ctx.fill(); ctx.restore();
    }

    // 지휘 EDDIE — 좌우 반전 반복 + 등급 표시
    if (ready(eddieImg)) {
      const eh = H * 0.34, ew = eh * (eddieImg.naturalWidth / eddieImg.naturalHeight);
      const flip = state.phase === 'play' && Math.floor(now / 420) % 2 === 0 ? -1 : 1;
      const bob = now > 0 ? Math.abs(Math.sin(now * 0.012)) * 9 : 0;
      const cxp = W * 0.11, topY = H * 0.93 - eh - bob;
      ctx.save(); ctx.translate(cxp + ew / 2, topY); ctx.scale(flip, 1); ctx.drawImage(eddieImg, -ew / 2, 0, ew, eh); ctx.restore();
      // 등급 말풍선
      const rk = rankNow();
      ctx.save(); ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(16,20,34,0.82)'; rr(ctx, cxp + ew / 2 - 52, topY - 52, 104, 40, 12); ctx.fill();
      ctx.fillStyle = '#cfe0ff'; ctx.font = '700 11px "Space Grotesk", sans-serif'; ctx.fillText('현재 등급', cxp + ew / 2, topY - 36);
      ctx.fillStyle = rk === 'S' ? '#ffd24a' : rk === 'A' ? '#7ef0a0' : rk === 'B' ? '#6fb7ff' : '#ff9e3c';
      ctx.font = '900 22px "Space Grotesk", sans-serif'; ctx.fillText(rk, cxp + ew / 2, topY - 16);
      ctx.restore(); ctx.textAlign = 'start';
    }

    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i]; p.y -= 0.9; p.life--;
      ctx.globalAlpha = Math.max(0, p.life / 55); ctx.fillStyle = `rgb(${p.color})`;
      ctx.font = '900 30px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(p.text, hitX(), p.y); ctx.globalAlpha = 1; if (p.life <= 0) pops.splice(i, 1);
    }
    ctx.textAlign = 'start';

    if (state.phase === 'play' && !state.ended) {
      for (const b of beats) if (!b.judged && now - b.target > W_GOOD) { b.judged = true; state.seen++; state.combo = 0; sync(); }
      if (now > TIMES[TOTAL - 1] + 800) finish();
    }
  }
  function loop() { draw(); raf = requestAnimationFrame(loop); }
  let raf = requestAnimationFrame(loop);

  function finish() {
    if (state.ended) return; state.ended = true; state.phase = 'done';
    const pass = state.hits >= PASS, rank = rankNow();
    cleanup();
    if (pass) {
      progress.mark('led');
      celebrateRoom({
        title: `라이트쇼 성공! ${rank}등급 🎉`,
        message: `적중 ${state.hits}/${TOTAL} · 최고 콤보 ${state.maxCombo} · 점수 ${state.score} — 💡 조명 메달 획득!`,
        exitLabel: '무대로 ▶', onExit: () => onExit?.(),
      });
    } else retryModal();
  }
  function retryModal() {
    const m = document.createElement('div'); m.className = 'modal-backdrop';
    m.innerHTML = `<div class="modal"><h3>💡 조금만 더!</h3>
      <p>${state.hits}/${TOTAL} 적중 — ${PASS}개 이상 맞히면 클리어예요. 박자에 집중해 다시 도전해볼까?</p>
      <div class="modal-actions"><button class="btn" id="rt-exit">나가기</button><button class="cel-go" id="rt-go">다시 도전 ▶</button></div></div>`;
    document.body.appendChild(m);
    m.querySelector('#rt-exit').onclick = () => { m.remove(); onExit?.(); };
    m.querySelector('#rt-go').onclick = () => { m.remove(); restart(); };
  }
  function restart() {
    beats.forEach((b) => { b.judged = false; }); pops.length = 0; LEDS.forEach((l) => l.flash = 0);
    Object.assign(state, { phase: 'count', countT: performance.now(), t0: 0, score: 0, combo: 0, maxCombo: 0, hits: 0, seen: 0, ended: false });
    sync();
  }
  function cleanup() { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); window.removeEventListener('resize', resize); }
}

function drawLed(ctx, x, y, r, color, on, label) {
  if (on) { const g = ctx.createRadialGradient(x, y, 1, x, y, r * 2.4); g.addColorStop(0, `rgba(${color},0.85)`); g.addColorStop(1, `rgba(${color},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, 6.283); ctx.fill(); }
  ctx.fillStyle = on ? `rgb(${color})` : `rgba(${color},0.32)`;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  ctx.strokeStyle = `rgba(${color},0.9)`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke();
  if (on) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.35, r * 0.28, r * 0.18, -0.5, 0, 6.283); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '700 11px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(label, x, y + r + 15); ctx.textAlign = 'start';
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawCover(ctx, img, W, H) { const ir = img.naturalWidth / img.naturalHeight, r = W / H; let dw, dh; if (ir > r) { dh = H; dw = H * ir; } else { dw = W; dh = W / ir; } ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh); }
