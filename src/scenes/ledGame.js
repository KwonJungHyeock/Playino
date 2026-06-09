// ledGame.js — 반짝반짝 라이트쇼 (LED · 디지털 출력) 타이밍 리듬 게임.
// 오른쪽에서 다가오는 비트 마커가 판정선에 닿는 순간 Space! → 무대 LED가 켜진다.
// Perfect/Good/Miss 판정 → 점수·콤보. 목표 적중률을 넘으면 클리어 → 💡 조명 메달.
// 학습 포인트: digitalWrite(HIGH/LOW) = 디지털 출력. 켜고 끄는 '타이밍'을 코드로 제어.
import { sfx } from '../app/sfx.js';
import { progress } from '../app/progress.js';
import { celebrateRoom } from './celebrate.js';

const N = 22;                 // 총 비트 수
const GAP = 620;              // 비트 간격(ms)
const LEAD = 1700;            // 비트가 판정선까지 오는 시간(ms)
const START_DELAY = 2400;     // 카운트다운 후 첫 비트까지
const W_PERFECT = 95, W_GOOD = 175;   // 판정 윈도우(ms)
const BULBS = 14;
const PASS = Math.ceil(N * 0.7);

const bgImg = new Image(); bgImg.src = '/brand/stage-led-bg.png';
const onImg = new Image(); onImg.src = '/brand/led-on.png';
const offImg = new Image(); offImg.src = '/brand/led-off.png';
const eddieImg = new Image(); eddieImg.src = '/brand/eddie-conductor.png';
const ready = (im) => im.complete && im.naturalWidth > 0;

export function showLedGame(root, { onExit } = {}) {
  root.innerHTML = `
    <div class="led scene-fade">
      <button class="snd-toggle" id="snd-toggle" title="소리 켜기/끄기">${sfx.muted ? '🔇' : '🔊'}</button>
      <div class="brand-badge"><span class="brand-dot"></span>Eduino&nbsp;<b>AI</b></div>
      <button class="bx-exit" id="led-exit">✕ 나가기</button>
      <div class="led-hud" id="led-hud">
        <span class="lh-item">점수 <b id="lh-score">0</b></span>
        <span class="lh-item">콤보 <b id="lh-combo">0</b></span>
        <span class="lh-item">적중 <b id="lh-hit">0</b>/<span id="lh-total">${N}</span></span>
      </div>
      <div class="world-host" id="led-host"></div>
      <div class="led-start" id="led-start">
        <div class="ls-card">
          <h2>💡 반짝반짝 라이트쇼</h2>
          <p>오른쪽에서 오는 <b>빛 마커</b>가 <b>판정선(◎)</b>에 닿는 순간 <b>Space</b>(또는 클릭)!<br/>
          박자에 맞춰 무대 조명을 켜는 게 바로 <b>디지털 출력</b>이야. <b>${PASS}개</b> 이상 맞히면 클리어 🎉</p>
          <button class="cel-go" id="led-go">시작하기 ▶</button>
        </div>
      </div>
    </div>`;

  const host = root.querySelector('#led-host');
  const canvas = document.createElement('canvas'); canvas.className = 'world-canvas'; host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const elScore = root.querySelector('#lh-score'), elCombo = root.querySelector('#lh-combo'), elHit = root.querySelector('#lh-hit');
  const snd = root.querySelector('#snd-toggle');
  snd.onclick = () => { const m = sfx.toggle(); snd.textContent = m ? '🔇' : '🔊'; };

  let W = 0, H = 0;
  function resize() { W = canvas.width = host.clientWidth || window.innerWidth; H = canvas.height = host.clientHeight || 600; }
  resize(); window.addEventListener('resize', resize);

  const hitX = () => W * 0.26;
  const state = { running: false, t0: 0, score: 0, combo: 0, maxCombo: 0, hits: 0, bulbs: 0, ended: false };
  const beats = Array.from({ length: N }, (_, i) => ({ i, target: START_DELAY + i * GAP, judged: false, lit: 0 }));
  const pops = [];   // 판정 텍스트 이펙트

  function judge(deltaAbs) { return deltaAbs <= W_PERFECT ? 'perfect' : deltaAbs <= W_GOOD ? 'good' : null; }

  function press() {
    if (!state.running || state.ended) return;
    const now = performance.now() - state.t0;
    let best = null, bestD = 1e9;
    for (const b of beats) { if (b.judged) continue; const d = Math.abs(now - b.target); if (d < bestD) { bestD = d; best = b; } }
    if (!best) return;
    const verdict = judge(bestD);
    if (verdict) {
      best.judged = true; best.lit = performance.now();
      const add = verdict === 'perfect' ? 100 : 60;
      state.combo++; state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.score += add + state.combo * 5; state.hits++;
      state.bulbs = Math.min(BULBS, state.bulbs + 1);
      sfx.start();
      pop(verdict === 'perfect' ? 'PERFECT!' : 'GOOD!', verdict === 'perfect' ? '#ffd24a' : '#7ef0a0');
    } else if (bestD < 360) {            // 가까운데 빗나감 → 미스
      best.judged = true; state.combo = 0; sfx.pop(); pop('MISS', '#ff7a8a');
    }
    sync();
  }
  function pop(text, color) { pops.push({ text, color, x: hitX(), y: H * 0.46, life: 60 }); }
  function sync() { elScore.textContent = state.score; elCombo.textContent = state.combo; elHit.textContent = state.hits; }

  function onKey(e) { if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); press(); } }
  window.addEventListener('keydown', onKey);
  canvas.addEventListener('pointerdown', press);

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // 배경
    if (ready(bgImg)) { drawCover(ctx, bgImg, W, H); ctx.fillStyle = 'rgba(14,8,22,0.34)'; ctx.fillRect(0, 0, W, H); }
    else { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3a2140'); g.addColorStop(1, '#1c1230'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

    const now = state.running ? performance.now() - state.t0 : 0;

    // 상단 LED 마퀴(적중할수록 켜짐)
    const by = H * 0.13, bw = W * 0.62, bx = W / 2 - bw / 2, bs = bw / BULBS;
    for (let i = 0; i < BULBS; i++) {
      const lit = i < state.bulbs, bxp = bx + bs * (i + 0.5), r = Math.min(22, bs * 0.32);
      drawBulb(ctx, bxp, by, r, lit, now * 0.001 + i);
    }

    // 판정선
    const hx = hitX();
    const pulse = 1 + Math.sin(now * 0.012) * 0.08;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(hx, H * 0.46, 34 * pulse, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,210,90,0.7)'; ctx.beginPath(); ctx.arc(hx, H * 0.46, 22 * pulse, 0, 6.283); ctx.stroke();
    // 레인
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, H * 0.46); ctx.lineTo(W, H * 0.46); ctx.stroke();

    // 비트 마커
    for (const b of beats) {
      if (b.judged) continue;
      const dt = b.target - now;
      if (dt > LEAD || dt < -W_GOOD - 60) continue;
      const x = hx + (dt / LEAD) * (W - hx - 40);
      const near = Math.abs(dt) < W_GOOD;
      ctx.save();
      ctx.shadowColor = 'rgba(255,210,90,0.9)'; ctx.shadowBlur = near ? 22 : 10;
      ctx.fillStyle = near ? '#fff0b0' : '#ffd24a';
      ctx.beginPath(); ctx.arc(x, H * 0.46, 17, 0, 6.283); ctx.fill();
      ctx.restore();
    }

    // 지휘 EDDIE
    const beatPhase = Math.abs(Math.sin(now * Math.PI / GAP));
    const eh = H * 0.34, ew = ready(eddieImg) ? eh * (eddieImg.naturalWidth / eddieImg.naturalHeight) : eh * 0.8;
    const ex = W * 0.1, ey = H * 0.92 - eh;
    if (ready(eddieImg)) { ctx.save(); ctx.translate(ex, ey + beatPhase * -8); ctx.drawImage(eddieImg, 0, 0, ew, eh); ctx.restore(); }

    // 판정 텍스트
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i]; p.y -= 0.8; p.life--;
      ctx.globalAlpha = Math.max(0, p.life / 60); ctx.fillStyle = p.color;
      ctx.font = '900 28px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y); ctx.globalAlpha = 1;
      if (p.life <= 0) pops.splice(i, 1);
    }
    ctx.textAlign = 'start';

    // 자동 미스 + 종료 체크
    if (state.running && !state.ended) {
      for (const b of beats) if (!b.judged && now - b.target > W_GOOD) { b.judged = true; state.combo = 0; sync(); }
      if (now > beats[N - 1].target + 700) finish();
    }
  }

  function loop() { draw(); raf = requestAnimationFrame(loop); }
  let raf = requestAnimationFrame(loop);

  function start() {
    root.querySelector('#led-start').classList.add('hide');
    state.running = true; state.t0 = performance.now();
  }
  root.querySelector('#led-go').onclick = start;

  function finish() {
    if (state.ended) return; state.ended = true; state.running = false;
    const pass = state.hits >= PASS;
    cleanup();
    if (pass) {
      progress.mark('led');
      celebrateRoom({
        title: '라이트쇼 성공! 🎉',
        message: `${state.hits}/${N} 적중 · 최고 콤보 ${state.maxCombo} · 점수 ${state.score}<br/><b>💡 조명 메달</b> 획득! 무대가 환하게 빛났어요.`,
        exitLabel: '무대로 ▶', onExit: () => onExit?.(),
      });
    } else {
      retryModal();
    }
  }

  function retryModal() {
    const m = document.createElement('div'); m.className = 'modal-backdrop';
    m.innerHTML = `<div class="modal"><h3>💡 조금만 더!</h3>
      <p>${state.hits}/${N} 적중 — <b>${PASS}개</b> 이상 맞히면 클리어예요.<br/>박자에 집중해서 다시 도전해볼까?</p>
      <div class="modal-actions"><button class="btn" id="rt-exit">나가기</button><button class="cel-go" id="rt-go">다시 도전 ▶</button></div></div>`;
    document.body.appendChild(m);
    m.querySelector('#rt-exit').onclick = () => { m.remove(); onExit?.(); };
    m.querySelector('#rt-go').onclick = () => { m.remove(); restart(); };
  }
  function restart() {
    beats.forEach((b) => { b.judged = false; b.lit = 0; });
    pops.length = 0;
    Object.assign(state, { running: true, t0: performance.now(), score: 0, combo: 0, maxCombo: 0, hits: 0, bulbs: 0, ended: false });
    sync();
  }

  function cleanup() { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); window.removeEventListener('resize', resize); }
  root.querySelector('#led-exit').onclick = () => { cleanup(); onExit?.(); };
}

function drawBulb(ctx, x, y, r, lit, t) {
  if (lit && ready(onImg)) { const s = r * 2.4; ctx.drawImage(onImg, x - s / 2, y - s / 2, s, s); return; }
  if (!lit && ready(offImg)) { const s = r * 2.4; ctx.drawImage(offImg, x - s / 2, y - s / 2, s, s); return; }
  if (lit) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, r * 2);
    g.addColorStop(0, `rgba(255,235,150,${0.7 + 0.2 * Math.sin(t * 3)})`); g.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#ffe680'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(180,170,150,0.5)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(120,90,40,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke();
}

function drawCover(ctx, img, W, H) {
  const ir = img.naturalWidth / img.naturalHeight, r = W / H;
  let dw, dh; if (ir > r) { dh = H; dw = H * ir; } else { dw = W; dh = W / ir; }
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
}
