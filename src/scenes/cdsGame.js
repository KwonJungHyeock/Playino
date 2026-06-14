// cdsGame.js — 손그림자 마술 (조도센서 · 빛/그림자 반응 게임)
// 떨어지는 신호(☀️ 비춰 / 🌑 가려)가 판정선에 닿는 순간, 빛 상태를 맞추면 적중.
// 화면: '가리기' 패드를 꾹(또는 Space) = 어둠 / 떼면 = 밝음.
// 실물: CDS(A0)를 손으로 가리면 어둠(폴링). 둘 중 하나만 어두워도 '어둠'으로 인정.
// 1차 쉬움 · 2차 빠름. 각 단계 A등급(85%↑) + 둘 다 통과해야 🔆 햇살 메달.
import { sfx } from '../app/sfx.js';
import { bgm } from '../app/bgm.js';
import { progress } from '../app/progress.js';
import { celebrateRoom } from './celebrate.js';
import { board } from '../app/board.js';

const ADC = 0, LEAD = 1700, PASS_ACC = 0.85, JUDGE_MS = 240;
const GAMES = [
  { key: 'easy', no: 1, name: '반딧불 정원', gap: 1500, seq: ['bright', 'dark', 'bright', 'dark', 'bright', 'dark', 'bright'] },
  { key: 'hard', no: 2, name: '빛과 그림자', gap: 1040, seq: ['dark', 'bright', 'dark', 'dark', 'bright', 'dark', 'bright', 'bright', 'dark', 'bright'] },
];

const bgImg = new Image(); bgImg.src = '/brand/stage-cds-bg.webp';
const eddieImg = new Image(); eddieImg.src = '/brand/eddie/eddie-hero.webp';
const ready = (im) => im.complete && im.naturalWidth > 0;
const gradeOf = (a) => a >= 0.95 ? 'S' : a >= 0.85 ? 'A' : a >= 0.7 ? 'B' : a >= 0.5 ? 'C' : 'D';
const lerp = (a, b, t) => a + (b - a) * t;

export function showCdsGame(root, { onExit } = {}) {
  root.innerHTML = `
    <div class="led scene-fade cdsgame">
      <div class="cds-stage-bg" id="cd-bg"></div>
      <div class="brand-badge"><span class="brand-dot"></span>Eduino&nbsp;<b>AI</b></div>
      <button class="snd-toggle" id="snd-toggle">${sfx.muted ? '🔇' : '🔊'}</button>
      <button class="bx-exit" id="cd-exit">✕ 전시관으로</button>
      <button class="bx-exit led-skip" id="cd-skip" hidden>⏭ 건너뛰기(테스트)</button>
      <div class="world-host" id="cd-host"></div>
      <div class="led-hud" id="cd-hud" hidden>
        <span class="lh-item" id="cd-stage">1단계</span>
        <span class="lh-item">🎯 적중 <b id="cd-hit">0</b>/<span id="cd-tot">0</span></span>
        <span class="lh-item">🔥 콤보 <b id="cd-combo">0</b></span>
        <span class="lh-item">⭐ <b id="cd-score">0</b></span>
      </div>
      <button class="cds-pad" id="cd-pad" hidden><span class="cds-pad-ico">🖐️</span><span class="cds-pad-lbl">가리기</span><span class="cds-pad-hint">꾹 누르기 / Space</span></button>
      <div class="led-prep" id="cd-prep">
        <div class="prep-card" style="max-width:600px;text-align:center">
          <h2>🔆 손그림자 마술</h2>
          <p class="prep-sub">떨어지는 신호가 판정선에 닿는 순간 빛 상태를 맞춰! <b>☀️ 비춰</b>는 그대로, <b>🌑 가려</b>는 <b>가리기 패드를 꾹</b>(또는 Space) 눌러 어둡게!</p>
          <p class="prep-sub">CDS를 <b>A0</b>에 연결하면 진짜 손으로 센서를 가려도 돼요. (없어도 화면으로 플레이)</p>
          <div class="prep-actions" style="justify-content:center">
            <button class="prep-btn" id="cd-connect">🔌 보드 연결(선택)</button>
            <button class="cel-go" id="cd-start">시작 ▶</button>
          </div>
        </div>
      </div>
    </div>`;

  const scene = root.querySelector('.led');
  const bg = root.querySelector('#cd-bg');
  bgImg.onload = () => { bg.style.backgroundImage = `url(${bgImg.src})`; };
  if (ready(bgImg)) bg.style.backgroundImage = `url(${bgImg.src})`;
  const host = root.querySelector('#cd-host');
  const canvas = document.createElement('canvas'); canvas.className = 'world-canvas'; host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const snd = root.querySelector('#snd-toggle'); snd.onclick = () => { const m = sfx.toggle(); snd.textContent = m ? '🔇' : '🔊'; };
  root.querySelector('#cd-exit').onclick = () => { cleanup(); onExit?.(); };
  const elHit = root.querySelector('#cd-hit'), elTot = root.querySelector('#cd-tot'), elCombo = root.querySelector('#cd-combo'), elScore = root.querySelector('#cd-score'), elStage = root.querySelector('#cd-stage');
  const hud = root.querySelector('#cd-hud'), pad = root.querySelector('#cd-pad'), skipBtn = root.querySelector('#cd-skip');

  let W = 0, H = 0;
  function resize() { W = canvas.width = host.clientWidth || window.innerWidth; H = canvas.height = host.clientHeight || 600; }
  resize(); window.addEventListener('resize', resize);

  // ── 빛 상태 ──
  let holding = false, sensorDark = false, light = 1;     // light: 0(어둠)~1(밝음) 시각용
  const isDark = () => holding || sensorDark;
  // 가리기 패드 + Space
  const press = (e) => { e && e.preventDefault(); holding = true; pad.classList.add('on'); };
  const release = (e) => { e && e.preventDefault(); holding = false; pad.classList.remove('on'); };
  pad.addEventListener('pointerdown', press);
  pad.addEventListener('pointerup', release);
  pad.addEventListener('pointerleave', release);
  pad.addEventListener('pointercancel', release);
  const onKeyDown = (e) => { if ((e.code === 'Space' || e.key === ' ') && state.phase === 'play') { e.preventDefault(); if (!holding) press(); } };
  const onKeyUp = (e) => { if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); release(); } };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // 실물 센서 폴링(연결 시) — 가린 정도 자동 보정
  let senseTimer = null, baseline = 800;
  function startSense() {
    stopSense(); if (!board.connected) { sensorDark = false; return; }
    board.analogRead(ADC).then((v) => { if (v != null) baseline = Math.max(300, v); }).catch(() => {});
    senseTimer = setInterval(async () => {
      const v = await board.analogRead(ADC); if (v == null) return;
      baseline = Math.max(baseline * 0.98, v);                 // 밝은 최댓값을 베이스라인으로 서서히 추종
      sensorDark = v < baseline * 0.55;
    }, 130);
  }
  function stopSense() { if (senseTimer) { clearInterval(senseTimer); senseTimer = null; } }

  root.querySelector('#cd-connect').onclick = async () => {
    const b = root.querySelector('#cd-connect');
    try { await board.connect(); b.textContent = '🔌 연결됨 ✓'; startSense(); } catch (e) { b.textContent = board.classify(e).note.slice(0, 16) + '…'; }
  };
  board.connectAuto().then(() => startSense()).catch(() => {});
  root.querySelector('#cd-start').onclick = () => { root.querySelector('#cd-prep').classList.add('hide'); skipBtn.hidden = false; pad.hidden = false; startFlow(); };

  // ── 플로우 ──
  const cleared = { easy: false, hard: false };
  let gi = 0, game = GAMES[0], beats = [], pops = [], parts = [];
  const state = { phase: 'prep', t0: 0, countT: 0, score: 0, combo: 0, maxCombo: 0, hits: 0, ended: false, lastHit: -1e9 };
  function panel(html) { const el = document.createElement('div'); el.className = 'led-panel'; el.innerHTML = `<div class="prep-card led-pcard">${html}</div>`; scene.appendChild(el); return el; }
  function startFlow() { gi = 0; nextGame(); }
  function nextGame() { if (gi >= GAMES.length) { finishAll(); return; } game = GAMES[gi]; showIntro(); }
  function showIntro() {
    bgm.setDuck(1); hud.hidden = true; pad.hidden = true;
    const el = panel(`<div class="lp-no">${game.no} / ${GAMES.length} 단계</div><h2>🔆 ${game.name}</h2>
      <p class="prep-sub"><b>☀️ 비춰</b>는 그대로 두고, <b>🌑 가려</b>는 가리기 패드를 꾹! 판정선에 닿는 순간이 중요해요 ✨</p>
      <p class="lp-cond">⭐ <b>A등급(85%↑)</b> 이상이면 통과!</p><button class="cel-go" id="lp-go">시작 ▶</button>`);
    el.querySelector('#lp-go').onclick = () => { el.remove(); beginPlay(); };
  }
  function beginPlay() {
    bgm.setDuck(0); pad.hidden = false;
    const t0 = 1000;
    beats = game.seq.map((need, i) => ({ i, need, target: t0 + i * game.gap, judged: false }));
    pops = []; parts = [];
    Object.assign(state, { phase: 'count', countT: performance.now(), t0: 0, score: 0, combo: 0, maxCombo: 0, hits: 0, ended: false, lastHit: -1e9 });
    elTot.textContent = beats.length; elStage.textContent = `${game.no}단계 · ${game.name}`;
    hud.hidden = false; sync();
  }
  function showResult(grade, pass) {
    bgm.setDuck(1); pad.hidden = true; const acc = Math.round((state.hits / beats.length) * 100); const last = gi === GAMES.length - 1;
    const el = panel(`<div class="lp-grade lp-${grade}">${grade}<span>등급</span></div><h2>${pass ? '통과! 🎉' : '조금만 더!'}</h2>
      <p class="prep-sub">${game.name} · 적중 ${state.hits}/${beats.length} (${acc}%) · 최고 콤보 ${state.maxCombo}</p>
      <p class="lp-cond">${pass ? (last ? '두 단계 완성! 메달을 받자 🏅' : '다음 단계로 ▶') : 'A등급(85%↑) 이상이어야 통과! 다시 도전!'}</p>
      <button class="cel-go" id="lp-next">${pass ? (last ? '메달 받기 🏅' : '다음 단계 ▶') : '다시 도전 ▶'}</button>`);
    el.querySelector('#lp-next').onclick = () => { el.remove(); if (pass) { cleared[game.key] = true; gi++; nextGame(); } else beginPlay(); };
  }
  function finishAll() {
    cleanup();
    if (cleared.easy && cleared.hard) {
      progress.mark('cds');
      celebrateRoom({ title: '빛의 마술사! 🔆', message: '빛과 그림자를 자유자재로 — 🔆 햇살 메달 획득! 어둠도 빛도 네 손안에 있어요.', exitLabel: '전시관으로 ▶', onExit: () => onExit?.() });
    } else onExit?.();
  }
  skipBtn.onclick = () => { document.querySelectorAll('.led-panel').forEach((e) => e.remove()); cleared[game.key] = true; state.ended = true; state.phase = 'result'; bgm.setDuck(1); gi++; nextGame(); };

  function sync() { elHit.textContent = state.hits; elCombo.textContent = state.combo; elScore.textContent = state.score; }
  function burst(x, y, color) { for (let i = 0; i < 14; i++) { const a = Math.random() * 6.283, s = 1.5 + Math.random() * 4; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: 36, color }); } }
  function pop(text, color) { pops.push({ text, color, y: H * 0.62, life: 48 }); }

  function judgeLineY() { return H * 0.76; }
  function draw() {
    const nowAbs = performance.now();
    // 빛 상태 시각화(부드럽게)
    light = lerp(light, isDark() ? 0 : 1, 0.18);
    ctx.clearRect(0, 0, W, H);
    // 배경 위 빛/그림자 틴트
    if (ready(bgImg)) { ctx.fillStyle = '#0a0e16'; ctx.fillRect(0, 0, W, H); }
    const darkA = (1 - light) * 0.62;
    ctx.fillStyle = `rgba(8,10,26,${darkA})`; ctx.fillRect(0, 0, W, H);
    // 따뜻한 빛 글로우(밝을 때)
    if (light > 0.05) { const g = ctx.createRadialGradient(W / 2, H * 0.4, 40, W / 2, H * 0.4, H * 0.7); g.addColorStop(0, `rgba(255,225,150,${0.16 * light})`); g.addColorStop(1, 'rgba(255,225,150,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

    const lineY = judgeLineY();
    // 판정선
    ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.25 * Math.sin(nowAbs * 0.005)})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(W * 0.2, lineY); ctx.lineTo(W * 0.8, lineY); ctx.stroke();
    // 빛 미터(우측)
    drawMeter(nowAbs);
    // 상태 표시(중앙 큰 해/달)
    ctx.save(); ctx.globalAlpha = 0.9; ctx.font = '900 64px serif'; ctx.textAlign = 'center';
    ctx.fillText(isDark() ? '🌑' : '☀️', W / 2, H * 0.3); ctx.restore();

    // 카운트다운
    if (state.phase === 'count') {
      const el = (nowAbs - state.countT) / 1000, n = 3 - Math.floor(el);
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.font = '900 90px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(n > 0 ? String(n) : 'GO!', W / 2, H * 0.5);
      if (el >= 3) { state.phase = 'play'; state.t0 = performance.now(); }
    }
    const now = state.phase === 'play' ? nowAbs - state.t0 : -1e9;

    // 신호(낙하)
    for (const b of beats) {
      if (b.judged) continue;
      const dt = b.target - now; if (dt > LEAD || dt < -JUDGE_MS - 120) continue;
      const y = lineY - (dt / LEAD) * (lineY - 40);
      const r = 34;
      const bright = b.need === 'bright';
      ctx.save(); ctx.shadowColor = bright ? 'rgba(255,210,90,.95)' : 'rgba(120,150,255,.9)'; ctx.shadowBlur = 22;
      ctx.fillStyle = bright ? '#ffd24a' : '#3a4570'; ctx.beginPath(); ctx.arc(W / 2, y, r, 0, 6.283); ctx.fill(); ctx.restore();
      ctx.font = '30px serif'; ctx.textAlign = 'center'; ctx.fillText(bright ? '☀️' : '🌑', W / 2, y + 10);
      ctx.fillStyle = '#fff'; ctx.font = '800 14px "Space Grotesk", sans-serif'; ctx.fillText(bright ? '비춰!' : '가려!', W / 2, y + r + 18);
    }

    // 판정
    if (state.phase === 'play' && !state.ended) {
      for (const b of beats) {
        if (b.judged || now < b.target) continue;
        b.judged = true;
        const ok = (b.need === 'dark') === isDark();
        if (ok) {
          state.combo++; state.maxCombo = Math.max(state.maxCombo, state.combo); state.hits++; state.lastHit = nowAbs;
          state.score += 100 + state.combo * 5;
          sfx.ok(); burst(W / 2, lineY, b.need === 'bright' ? '255,210,90' : '150,170,255'); pop(b.need === 'bright' ? 'BRIGHT!' : 'SHADOW!', b.need === 'bright' ? '#ffd24a' : '#9fb0ff');
        } else { state.combo = 0; sfx.no(); pop('MISS', '#ff9a9a'); }
        sync();
      }
      if (beats.length && now > beats[beats.length - 1].target + 950) endPlay();
    }

    // 파티클
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.16; p.life--; ctx.globalAlpha = Math.max(0, p.life / 36); ctx.fillStyle = `rgb(${p.color})`; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; if (p.life <= 0) parts.splice(i, 1); }
    // 판정 텍스트
    for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.y -= 0.7; p.life--; ctx.globalAlpha = Math.max(0, p.life / 48); ctx.fillStyle = p.color; ctx.font = '900 26px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(p.text, W / 2, p.y); ctx.globalAlpha = 1; if (p.life <= 0) pops.splice(i, 1); }
    // 콤보
    if (state.combo >= 2) { ctx.fillStyle = '#ffd24a'; ctx.font = '900 24px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`🔥 ${state.combo} COMBO`, W / 2, H * 0.42); }
    // EDDIE(반응)
    if (ready(eddieImg)) { const eh = H * 0.26, ew = eh * (eddieImg.naturalWidth / eddieImg.naturalHeight); const bob = now > 0 ? Math.abs(Math.sin(now * 0.006)) * 7 : 0; ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * light; ctx.drawImage(eddieImg, W * 0.045, H * 0.97 - eh - bob, ew, eh); ctx.restore(); }
  }
  function drawMeter(nowAbs) {
    const mx = W * 0.9, my = H * 0.18, mh = H * 0.5, mw = 22;
    ctx.fillStyle = 'rgba(255,255,255,.12)'; rr(ctx, mx, my, mw, mh, 11); ctx.fill();
    const fh = mh * light; ctx.fillStyle = '#ffd24a'; rr(ctx, mx, my + (mh - fh), mw, fh, 11); ctx.fill();
    ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.fillText('☀️', mx + mw / 2, my - 8); ctx.fillText('🌑', mx + mw / 2, my + mh + 22);
  }
  function endPlay() { if (state.ended) return; state.ended = true; state.phase = 'result'; const acc = state.hits / beats.length; showResult(gradeOf(acc), acc >= PASS_ACC); }
  function loop() { draw(); raf = requestAnimationFrame(loop); }
  let raf = requestAnimationFrame(loop);
  function cleanup() { bgm.setDuck(1); cancelAnimationFrame(raf); stopSense(); window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('resize', resize); }
}

function rr(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
