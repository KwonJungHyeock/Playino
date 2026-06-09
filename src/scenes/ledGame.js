// ledGame.js — 반짝반짝 라이트쇼 (LED · 디지털 출력)
// [준비] 결선 회로도 안내 → 보드 연결/진단(WebSerial) → 통과 시 [게임] 타이밍 리듬.
// 빛 마커가 판정선에 닿는 순간 Space! Perfect/Good/Miss. 점점 빨라지는 난이도.
// 목표 적중률을 넘으면 클리어 → 💡 조명 메달. 학습: digitalWrite(HIGH/LOW) 타이밍 제어.
import { sfx } from '../app/sfx.js';
import { progress } from '../app/progress.js';
import { celebrateRoom } from './celebrate.js';
import { board } from '../app/board.js';

const LEAD = 1450;                     // 마커가 판정선까지 오는 시간(ms)
const W_PERFECT = 90, W_GOOD = 170;    // 판정 윈도우(ms)
const BULBS = 14;

const bgImg = new Image(); bgImg.src = '/brand/stage-led-bg.png';
const onImg = new Image(); onImg.src = '/brand/led-on.png';
const offImg = new Image(); offImg.src = '/brand/led-off.png';
const eddieImg = new Image(); eddieImg.src = '/brand/eddie-conductor.png';
const ready = (im) => im.complete && im.naturalWidth > 0;

// 점점 빨라지는 비트맵(+가끔 빠른 더블) → 변수와 난이도
function buildBeatmap() {
  const arr = []; let t = 1100, gap = 700;
  for (let i = 0; i < 20; i++) {
    arr.push(t);
    if (i >= 6 && i % 4 === 0) arr.push(t + gap * 0.5);   // 빠른 더블
    gap = Math.max(330, gap - 20);                         // 점점 빠르게
    t += gap;
  }
  return arr.sort((a, b) => a - b);
}

export function showLedGame(root, { onExit } = {}) {
  const TIMES = buildBeatmap();
  const TOTAL = TIMES.length;
  const PASS = Math.ceil(TOTAL * 0.7);

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
          <p class="prep-sub">회로도대로 LED 2개를 브레드보드에 결선하고, 보드를 연결하면 게임이 시작돼요!</p>
          <div class="prep-grid">
            <div class="prep-img" id="prep-img"></div>
            <div class="prep-side">
              <table class="prep-table">
                <thead><tr><th>아두이노</th><th>LED</th></tr></thead>
                <tbody>
                  <tr><td>D6</td><td>＋ 긴 다리 (220Ω 저항)</td></tr>
                  <tr><td>D13</td><td>＋ 긴 다리 (220Ω 저항)</td></tr>
                  <tr><td>GND</td><td>－ 짧은 다리</td></tr>
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

  // ----- 공통 -----
  const host = root.querySelector('#led-host');
  const canvas = document.createElement('canvas'); canvas.className = 'world-canvas'; host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const snd = root.querySelector('#snd-toggle');
  snd.onclick = () => { const m = sfx.toggle(); snd.textContent = m ? '🔇' : '🔊'; };
  root.querySelector('#led-exit').onclick = () => { cleanup(); onExit?.(); };

  // 회로도 이미지(있으면)
  const wImg = new Image();
  wImg.onload = () => { root.querySelector('#prep-img').style.backgroundImage = `url(${wImg.src})`; root.querySelector('#prep-img').classList.add('has-img'); };
  wImg.src = '/brand/wiring-led.png';

  let W = 0, H = 0;
  function resize() { W = canvas.width = host.clientWidth || window.innerWidth; H = canvas.height = host.clientHeight || 600; }
  resize(); window.addEventListener('resize', resize);

  // ===== 준비(prep) 단계: 결선 + 보드 연결 진단 =====
  const pStatus = root.querySelector('#prep-status');
  const bConnect = root.querySelector('#p-connect'), bTest = root.querySelector('#p-test'), bStart = root.querySelector('#p-start');
  let connected = false;
  function setStatus(t, kind = '') { pStatus.textContent = '상태 · ' + t; pStatus.className = 'prep-status ' + kind; }

  if (!board.isSupported()) setStatus('이 브라우저는 보드 연결 미지원 — 아래 데모로 플레이할 수 있어요', 'warn');
  else board.connectAuto().then((a) => { if (a.ok) onConnected(); }).catch(() => {});

  bConnect.onclick = async () => {
    if (!board.isSupported()) { setStatus('Chrome/Edge 데스크톱에서 열어야 보드를 연결할 수 있어요', 'warn'); return; }
    setStatus('연결 중… 포트를 골라주세요 🔌'); sfx.click();
    try { await board.connect(); onConnected(); }
    catch (e) { const c = board.classify(e); setStatus(c.note, 'warn'); }
  };
  function onConnected() { connected = true; setStatus('보드 연결 완료! ✅ LED 테스트로 결선을 확인하거나 바로 시작하세요', 'ok'); bTest.disabled = false; bStart.disabled = false; bConnect.textContent = '🔌 연결됨 ✓'; }
  bTest.onclick = async () => {
    setStatus('D6·D13 LED를 깜빡여 볼게요 — 둘 다 깜빡이면 결선 성공! 💡'); sfx.ok();
    try { await board.blink(6, 3, 220); await board.blink(13, 3, 220); }
    catch (e) { setStatus('테스트 실패 — 결선을 다시 확인해주세요', 'warn'); }
  };
  bStart.onclick = () => beginGame();
  root.querySelector('#p-skip').onclick = () => beginGame();

  function beginGame() {
    root.querySelector('#led-prep').classList.add('hide');
    root.querySelector('#led-hud').hidden = false;
    state.phase = 'count'; state.countT = performance.now();
  }

  // ===== 게임(play) =====
  const elScore = root.querySelector('#lh-score'), elCombo = root.querySelector('#lh-combo'), elHit = root.querySelector('#lh-hit');
  const beats = TIMES.map((target, i) => ({ i, target, judged: false }));
  const pops = [];
  const state = { phase: 'prep', t0: 0, countT: 0, score: 0, combo: 0, maxCombo: 0, hits: 0, bulbs: 0, ended: false };
  const hitX = () => Math.max(150, W * 0.24);

  function press() {
    if (state.phase !== 'play' || state.ended) return;
    const now = performance.now() - state.t0;
    let best = null, bestD = 1e9;
    for (const b of beats) { if (b.judged) continue; const d = Math.abs(now - b.target); if (d < bestD) { bestD = d; best = b; } }
    if (!best) return;
    if (bestD <= W_GOOD) {
      best.judged = true; const perfect = bestD <= W_PERFECT;
      state.combo++; state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.score += (perfect ? 100 : 60) + state.combo * 5; state.hits++;
      state.bulbs = Math.min(BULBS, state.bulbs + 1);
      perfect ? sfx.perfect() : sfx.ok();
      pop(perfect ? 'PERFECT!' : 'GOOD!', perfect ? '#ffd24a' : '#7ef0a0');
    } else if (bestD < 340) { best.judged = true; state.combo = 0; sfx.no(); pop('MISS', '#ff7a8a'); }
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

    // 상단 LED 마퀴
    const by = H * 0.12, bw = Math.min(W * 0.6, 760), bx = W / 2 - bw / 2, bs = bw / BULBS;
    for (let i = 0; i < BULBS; i++) drawBulb(ctx, bx + bs * (i + 0.5), by, Math.min(20, bs * 0.34), i < state.bulbs, state.t0 ? (performance.now() * 0.001 + i) : i);

    if (state.phase === 'count') {
      const el = (performance.now() - state.countT) / 1000;
      const n = 3 - Math.floor(el);
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.font = '900 90px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(n > 0 ? String(n) : 'GO!', W / 2, H * 0.5);
      ctx.textAlign = 'start';
      if (el >= 3) { state.phase = 'play'; state.t0 = performance.now(); }
    }

    const now = state.phase === 'play' ? performance.now() - state.t0 : -1e9;
    const hx = hitX(), laneY = H * 0.46;

    // 판정선
    const pulse = 1 + Math.sin(performance.now() * 0.012) * 0.08;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, laneY, 34 * pulse, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,210,90,0.75)'; ctx.beginPath(); ctx.arc(hx, laneY, 22 * pulse, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, laneY); ctx.lineTo(W, laneY); ctx.stroke();

    // 비트 마커
    for (const b of beats) {
      if (b.judged) continue;
      const dt = b.target - now;
      if (dt > LEAD || dt < -W_GOOD - 80) continue;
      const x = hx + (dt / LEAD) * (W - hx - 50);
      const near = Math.abs(dt) < W_GOOD;
      ctx.save(); ctx.shadowColor = 'rgba(255,210,90,0.9)'; ctx.shadowBlur = near ? 24 : 10;
      ctx.fillStyle = near ? '#fff0b0' : '#ffd24a'; ctx.beginPath(); ctx.arc(x, laneY, 17, 0, 6.283); ctx.fill(); ctx.restore();
    }

    // 지휘 EDDIE
    if (ready(eddieImg)) {
      const eh = H * 0.34, ew = eh * (eddieImg.naturalWidth / eddieImg.naturalHeight);
      const beatPhase = now > 0 ? Math.abs(Math.sin(now * 0.012)) : 0;
      ctx.save(); ctx.translate(W * 0.085, H * 0.93 - eh - beatPhase * 9); ctx.drawImage(eddieImg, 0, 0, ew, eh); ctx.restore();
    }

    // 판정 텍스트
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i]; p.y -= 0.9; p.life--;
      ctx.globalAlpha = Math.max(0, p.life / 55); ctx.fillStyle = p.color;
      ctx.font = '900 30px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(p.text, hitX(), p.y); ctx.globalAlpha = 1;
      if (p.life <= 0) pops.splice(i, 1);
    }
    ctx.textAlign = 'start';

    if (state.phase === 'play' && !state.ended) {
      for (const b of beats) if (!b.judged && now - b.target > W_GOOD) { b.judged = true; state.combo = 0; sync(); }
      if (now > TIMES[TOTAL - 1] + 800) finish();
    }
  }
  function loop() { draw(); raf = requestAnimationFrame(loop); }
  let raf = requestAnimationFrame(loop);

  function finish() {
    if (state.ended) return; state.ended = true; state.phase = 'done';
    const pass = state.hits >= PASS;
    const ratio = state.hits / TOTAL;
    const rank = ratio >= 1 ? 'S' : ratio >= 0.9 ? 'A' : ratio >= 0.7 ? 'B' : 'C';
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
    beats.forEach((b) => { b.judged = false; }); pops.length = 0;
    Object.assign(state, { phase: 'count', countT: performance.now(), t0: 0, score: 0, combo: 0, maxCombo: 0, hits: 0, bulbs: 0, ended: false });
    sync();
  }
  function cleanup() { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); window.removeEventListener('resize', resize); }
}

function drawBulb(ctx, x, y, r, lit, t) {
  if (lit && ready(onImg)) { const s = r * 2.6; ctx.drawImage(onImg, x - s / 2, y - s / 2, s, s); return; }
  if (!lit && ready(offImg)) { const s = r * 2.6; ctx.drawImage(offImg, x - s / 2, y - s / 2, s, s); return; }
  if (lit) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, r * 2);
    g.addColorStop(0, `rgba(255,235,150,${0.7 + 0.2 * Math.sin(t * 3)})`); g.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#ffe680'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  } else { ctx.fillStyle = 'rgba(180,170,150,0.5)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); }
  ctx.strokeStyle = 'rgba(120,90,40,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke();
}

function drawCover(ctx, img, W, H) {
  const ir = img.naturalWidth / img.naturalHeight, r = W / H;
  let dw, dh; if (ir > r) { dh = H; dw = H * ir; } else { dw = W; dh = W / ir; }
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
}
