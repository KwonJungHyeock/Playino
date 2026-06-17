// joystickGame.js — 별★줍기 대모험 (조이스틱 · 우주선 조종)
// 조이스틱으로 우주선을 조종해 별을 모으고 운석을 피한다. 제한시간 내 별 85%↑ 수집 → 통과.
// 입력: 키보드(방향키/WASD) · 화면 조이스틱(터치) · 실물 조이스틱(A0=X, A1=Y, 폴링).
// 1차 별빛 산책(여유) · 2차 운석 지대(스릴). 둘 다 A등급 → 🚀 조종 메달.
import { sfx } from '../app/sfx.js';
import { bgm } from '../app/bgm.js';
import { progress } from '../app/progress.js';
import { celebrateRoom } from './celebrate.js';
import { board } from '../app/board.js';

const PINS = { x: 0, y: 1 }, PASS_ACC = 0.85;
const GAMES = [
  { key: 'easy', no: 1, name: '별빛 산책', time: 30000, stars: 14, rocks: 4, rockSpd: 1.4 },
  { key: 'hard', no: 2, name: '운석 지대', time: 32000, stars: 18, rocks: 9, rockSpd: 2.4 },
];

const bgImg = new Image(); bgImg.src = '/brand/stage-joystick-bg.webp';
const shipImg = new Image(); shipImg.src = '/brand/eddie-pilot.webp';
const heroImg = new Image(); heroImg.src = '/brand/eddie/eddie-hero.webp';
const ready = (im) => im.complete && im.naturalWidth > 0;
const gradeOf = (a) => a >= 0.95 ? 'S' : a >= 0.85 ? 'A' : a >= 0.7 ? 'B' : a >= 0.5 ? 'C' : 'D';

export function showJoystickGame(root, { onExit } = {}) {
  root.innerHTML = `
    <div class="led scene-fade joygame">
      <div class="joy-stage-bg" id="jy-bg"></div>
      <div class="brand-badge"><span class="brand-dot"></span>Eduino&nbsp;<b>AI</b></div>
      <button class="snd-toggle" id="snd-toggle">${sfx.muted ? '🔇' : '🔊'}</button>
      <button class="bx-exit" id="jy-exit">✕ 전시관으로</button>
      <button class="bx-exit led-skip" id="jy-skip" hidden>⏭ 건너뛰기(테스트)</button>
      <div class="world-host" id="jy-host"></div>
      <div class="led-hud" id="jy-hud" hidden>
        <span class="lh-item" id="jy-stage">1단계</span>
        <span class="lh-item">⭐ <b id="jy-star">0</b>/<span id="jy-tot">0</span></span>
        <span class="lh-item">🔥 <b id="jy-combo">0</b></span>
        <span class="lh-item">⏱ <b id="jy-time">30</b>s</span>
      </div>
      <div class="joy-pad" id="jy-pad" hidden><div class="joy-knob"></div></div>
      <div class="led-prep" id="jy-prep">
        <div class="prep-card" style="max-width:600px;text-align:center">
          <h2>🚀 별★줍기 대모험</h2>
          <p class="prep-sub">조이스틱으로 우주선을 조종해 <b>별을 모으고</b> 운석을 피하자! 제한시간 안에 별을 충분히 모으면 통과 ⭐</p>
          <p class="prep-sub">조작: <b>화면 조이스틱</b>(왼쪽 아래) · 방향키/WASD · 실물 조이스틱(A0·A1)</p>
          <div class="prep-wire"><b>🔌 결선</b>
            <table class="prep-table prep-wire-t"><tbody>
              <tr><td>🕹️ X(좌우)</td><td><b>A0</b></td></tr>
              <tr><td>🕹️ Y(상하)</td><td><b>A1</b></td></tr>
            </tbody></table>
            <span class="prep-wire-note">Grove 조이스틱을 A0 포트에 (X→A0 · Y→A1 자동)</span>
          </div>
          <div class="prep-actions" style="justify-content:center">
            <button class="prep-btn" id="jy-connect">🔌 보드 연결(선택)</button>
            <button class="cel-go" id="jy-start">시작 ▶</button>
          </div>
        </div>
      </div>
    </div>`;

  const scene = root.querySelector('.led');
  const bg = root.querySelector('#jy-bg');
  bgImg.onload = () => { bg.style.backgroundImage = `url(${bgImg.src})`; };
  if (ready(bgImg)) bg.style.backgroundImage = `url(${bgImg.src})`;
  const host = root.querySelector('#jy-host');
  const canvas = document.createElement('canvas'); canvas.className = 'world-canvas'; host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const snd = root.querySelector('#snd-toggle'); snd.onclick = () => { const m = sfx.toggle(); snd.textContent = m ? '🔇' : '🔊'; };
  root.querySelector('#jy-exit').onclick = () => { cleanup(); onExit?.(); };
  const elStar = root.querySelector('#jy-star'), elTot = root.querySelector('#jy-tot'), elCombo = root.querySelector('#jy-combo'), elTime = root.querySelector('#jy-time'), elStage = root.querySelector('#jy-stage');
  const hud = root.querySelector('#jy-hud'), pad = root.querySelector('#jy-pad'), skipBtn = root.querySelector('#jy-skip');

  let W = 0, H = 0;
  function resize() { W = canvas.width = host.clientWidth || window.innerWidth; H = canvas.height = host.clientHeight || 600; }
  resize(); window.addEventListener('resize', resize);

  // ── 입력: 키보드 + 화면 조이스틱 + 실물 ──
  const keys = new Set();
  const onKeyDown = (e) => { const k = e.key.toLowerCase(); if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) { e.preventDefault(); keys.add(k); } };
  const onKeyUp = (e) => keys.delete(e.key.toLowerCase());
  window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp);
  const joy = { x: 0, y: 0 }; const knob = pad.querySelector('.joy-knob');
  const R = 48; let joyId = null, jcx = 0, jcy = 0;
  const jMove = (e) => { if (joyId !== e.pointerId) return; let dx = e.clientX - jcx, dy = e.clientY - jcy; const d = Math.hypot(dx, dy); const m = d > 0 ? Math.min(1, d / R) / d : 0; joy.x = dx * m; joy.y = dy * m; knob.style.transform = `translate(${joy.x * R}px, ${joy.y * R}px)`; };
  const jEnd = (e) => { if (joyId !== e.pointerId) return; joyId = null; joy.x = 0; joy.y = 0; knob.style.transform = 'translate(0,0)'; };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); joyId = e.pointerId; const r = pad.getBoundingClientRect(); jcx = r.left + r.width / 2; jcy = r.top + r.height / 2; try { pad.setPointerCapture(e.pointerId); } catch (_) {} jMove(e); });
  pad.addEventListener('pointermove', jMove); pad.addEventListener('pointerup', jEnd); pad.addEventListener('pointercancel', jEnd);
  // 실물 조이스틱 폴링
  let hwTimer = null, hw = { x: 0, y: 0 };
  function startHw() { stopHw(); if (!board.connected) return; hwTimer = setInterval(async () => { const vx = await board.analogRead(PINS.x); const vy = await board.analogRead(PINS.y); if (vx != null) hw.x = Math.abs(vx - 512) < 90 ? 0 : (vx - 512) / 512; if (vy != null) hw.y = Math.abs(vy - 512) < 90 ? 0 : (vy - 512) / 512; }, 110); }
  function stopHw() { if (hwTimer) { clearInterval(hwTimer); hwTimer = null; } hw.x = 0; hw.y = 0; }
  function inputVec() {
    let x = 0, y = 0;
    if (keys.has('arrowleft') || keys.has('a')) x -= 1; if (keys.has('arrowright') || keys.has('d')) x += 1;
    if (keys.has('arrowup') || keys.has('w')) y -= 1; if (keys.has('arrowdown') || keys.has('s')) y += 1;
    if (joy.x || joy.y) { x = joy.x; y = joy.y; }
    else if (hw.x || hw.y) { x = hw.x; y = hw.y; }
    const d = Math.hypot(x, y); if (d > 1) { x /= d; y /= d; }
    return { x, y };
  }

  root.querySelector('#jy-connect').onclick = async () => { const b = root.querySelector('#jy-connect'); try { await board.connect(); b.textContent = '🔌 연결됨 ✓'; startHw(); } catch (e) { b.textContent = board.classify(e).note.slice(0, 16) + '…'; } };
  board.connectAuto().then(() => startHw()).catch(() => {});
  root.querySelector('#jy-start').onclick = () => { root.querySelector('#jy-prep').classList.add('hide'); skipBtn.hidden = false; startFlow(); };

  // ── 플로우 ──
  const cleared = { easy: false, hard: false };
  let gi = 0, game = GAMES[0], P = null, stars = [], rocks = [], parts = [];
  const state = { phase: 'prep', t0: 0, countT: 0, got: 0, total: 0, combo: 0, maxCombo: 0, ended: false, stun: 0 };
  function panel(html) { const el = document.createElement('div'); el.className = 'led-panel'; el.innerHTML = `<div class="prep-card led-pcard">${html}</div>`; scene.appendChild(el); return el; }
  function startFlow() { gi = 0; nextGame(); }
  function nextGame() { if (gi >= GAMES.length) { finishAll(); return; } game = GAMES[gi]; showIntro(); }
  function showIntro() {
    bgm.setDuck(1); hud.hidden = true; pad.hidden = true;
    const el = panel(`<div class="lp-no">${game.no} / ${GAMES.length} 단계</div><h2>🚀 ${game.name}</h2>
      <p class="prep-sub">조이스틱으로 우주선을 움직여 <b>별 ${game.stars}개</b>를 모아! 운석에 부딪히면 잠깐 멈춰요 ☄️</p>
      <p class="lp-cond">⭐ <b>${Math.ceil(game.stars * PASS_ACC)}개 이상</b>(A등급) 모으면 통과!</p><button class="cel-go" id="lp-go">시작 ▶</button>`);
    el.querySelector('#lp-go').onclick = () => { el.remove(); beginPlay(); };
  }
  function spawnStar() { stars.push({ x: 40 + Math.random() * (W - 80), y: 60 + Math.random() * (H - 160), r: 13, t: performance.now() }); }
  function beginPlay() {
    bgm.setDuck(0); pad.hidden = false;
    P = { x: W / 2, y: H / 2 };
    stars = []; rocks = []; parts = [];
    for (let i = 0; i < game.rocks; i++) { const a = Math.random() * 6.283; rocks.push({ x: Math.random() * W, y: Math.random() * H, vx: Math.cos(a) * game.rockSpd, vy: Math.sin(a) * game.rockSpd, r: 20 + Math.random() * 14 }); }
    Object.assign(state, { phase: 'count', countT: performance.now(), t0: 0, got: 0, total: game.stars, combo: 0, maxCombo: 0, ended: false, stun: 0, spawned: 0 });
    elTot.textContent = game.stars; elStage.textContent = `${game.no}단계 · ${game.name}`;
    hud.hidden = false; sync();
    for (let i = 0; i < 4; i++) spawnStar();   // 초기 별
  }
  function showResult(grade, pass) {
    bgm.setDuck(1); pad.hidden = true; const last = gi === GAMES.length - 1; const pct = Math.round(state.got / state.total * 100);
    const el = panel(`<div class="lp-grade lp-${grade}">${grade}<span>등급</span></div><h2>${pass ? '통과! 🎉' : '조금만 더!'}</h2>
      <p class="prep-sub">${game.name} · 별 ${state.got}/${state.total} (${pct}%) · 최고 콤보 ${state.maxCombo}</p>
      <p class="lp-cond">${pass ? (last ? '두 미션 완성! 메달을 받자 🏅' : '다음 미션으로 ▶') : 'A등급(85%↑)이어야 통과! 다시 도전!'}</p>
      <button class="cel-go" id="lp-next">${pass ? (last ? '메달 받기 🏅' : '다음 미션 ▶') : '다시 도전 ▶'}</button>`);
    el.querySelector('#lp-next').onclick = () => { el.remove(); if (pass) { cleared[game.key] = true; gi++; nextGame(); } else beginPlay(); };
  }
  function finishAll() {
    cleanup();
    if (cleared.easy && cleared.hard) { progress.mark('joystick'); celebrateRoom({ title: '우주 파일럿! 🚀', message: '조이스틱으로 우주를 누비며 별을 모았어요 — 🚀 조종 메달 획득! 이제 진짜 조종사예요.', exitLabel: '전시관으로 ▶', onExit: () => onExit?.() }); }
    else onExit?.();
  }
  skipBtn.onclick = () => { document.querySelectorAll('.led-panel').forEach((e) => e.remove()); cleared[game.key] = true; state.ended = true; state.phase = 'result'; bgm.setDuck(1); gi++; nextGame(); };
  function sync() { elStar.textContent = state.got; elCombo.textContent = state.combo; }
  function burst(x, y, c) { for (let i = 0; i < 12; i++) { const a = Math.random() * 6.283, s = 1 + Math.random() * 4; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 32, color: c }); } }

  let lastT = performance.now();
  function update(dt, now) {
    if (state.phase !== 'play' || state.ended) return;
    // 시간
    const left = game.time - (now - state.t0); elTime.textContent = Math.max(0, Math.ceil(left / 1000));
    if (left <= 0) { endPlay(); return; }
    // 이동
    if (state.stun > 0) state.stun -= dt * 16.67;
    const spd = (state.stun > 0 ? 1.2 : 5.0);
    const v = inputVec(); P.x += v.x * spd * dt; P.y += v.y * spd * dt;
    P.x = Math.max(22, Math.min(W - 22, P.x)); P.y = Math.max(40, Math.min(H - 30, P.y));
    // 별 스폰(시간에 걸쳐 총 game.stars)
    if (state.spawned < game.stars - 4 && stars.filter((s) => !s.got).length < 6 && Math.random() < 0.02 * dt) { spawnStar(); state.spawned++; }
    // 별 수집
    for (const s of stars) { if (s.got) continue; if (Math.hypot(P.x - s.x, P.y - s.y) < s.r + 20) { s.got = true; state.got++; state.combo++; state.maxCombo = Math.max(state.maxCombo, state.combo); sfx.note(520 + Math.min(8, state.combo) * 40, 160); burst(s.x, s.y, '255,220,90'); sync(); if (state.got >= state.total) { endPlay(); return; } } }
    // 운석
    for (const k of rocks) {
      k.x += k.vx * dt; k.y += k.vy * dt;
      if (k.x < k.r || k.x > W - k.r) k.vx *= -1; if (k.y < k.r + 30 || k.y > H - k.r) k.vy *= -1;
      if (state.stun <= 0 && Math.hypot(P.x - k.x, P.y - k.y) < k.r + 16) { state.stun = 700; state.combo = 0; sfx.no(); burst(P.x, P.y, '255,140,140'); sync(); }
    }
  }
  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    if (!ready(bgImg)) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a1640'); g.addColorStop(1, '#0a0820'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    else { ctx.fillStyle = 'rgba(10,8,26,0.25)'; ctx.fillRect(0, 0, W, H); }
    if (state.phase === 'count') { const el = (now - state.countT) / 1000, n = 3 - Math.floor(el); ctx.fillStyle = '#fff'; ctx.font = '900 90px "Space Grotesk",sans-serif'; ctx.textAlign = 'center'; ctx.fillText(n > 0 ? String(n) : 'GO!', W / 2, H * 0.5); if (el >= 3) { state.phase = 'play'; state.t0 = performance.now(); } }
    // 별
    for (const s of stars) { if (s.got) continue; const tw = 0.7 + 0.3 * Math.sin(now * 0.006 + s.t); ctx.save(); ctx.globalAlpha = tw; ctx.fillStyle = '#ffe066'; ctx.shadowColor = 'rgba(255,220,90,.9)'; ctx.shadowBlur = 16; star(ctx, s.x, s.y, s.r, 5); ctx.fill(); ctx.restore(); }
    // 운석
    for (const k of rocks) { ctx.save(); ctx.fillStyle = '#8a8496'; ctx.strokeStyle = '#5a5568'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(k.x, k.y, k.r, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#6f6a7e'; ctx.beginPath(); ctx.arc(k.x - k.r * 0.3, k.y - k.r * 0.2, k.r * 0.22, 0, 6.283); ctx.fill(); ctx.restore(); }
    // 우주선(에디)
    if (P) {
      const blink = state.stun > 0 && Math.floor(now / 90) % 2 === 0;
      if (!blink) {
        const img = ready(shipImg) ? shipImg : (ready(heroImg) ? heroImg : null);
        if (img) { const s = 64, w = s * (img.naturalWidth / img.naturalHeight); ctx.drawImage(img, P.x - w / 2, P.y - s / 2, w, s); }
        else { ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(P.x, P.y, 16, 0, 6.283); ctx.fill(); }
      }
      // 진행방향 제트
      const v = inputVec(); if (v.x || v.y) { ctx.save(); ctx.globalAlpha = .6; ctx.fillStyle = '#6fd0ff'; ctx.beginPath(); ctx.arc(P.x - v.x * 22, P.y - v.y * 22, 6, 0, 6.283); ctx.fill(); ctx.restore(); }
    }
    // 파티클
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.life--; ctx.globalAlpha = Math.max(0, p.life / 32); ctx.fillStyle = `rgb(${p.color})`; ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; if (p.life <= 0) parts.splice(i, 1); }
    if (state.combo >= 2 && state.phase === 'play') { ctx.fillStyle = '#ffd24a'; ctx.font = '900 24px "Space Grotesk",sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`🔥 ${state.combo} COMBO`, W / 2, H * 0.1); }
  }
  function endPlay() { if (state.ended) return; state.ended = true; state.phase = 'result'; const acc = state.got / state.total; showResult(gradeOf(acc), acc >= PASS_ACC); }
  function loop(now) { const dt = Math.min(40, now - lastT) / 16.67; lastT = now; update(dt, now); draw(now); raf = requestAnimationFrame(loop); }
  let raf = requestAnimationFrame(loop);
  function cleanup() { bgm.setDuck(1); cancelAnimationFrame(raf); stopHw(); window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('resize', resize); }
}

function star(ctx, cx, cy, r, n) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const rad = i % 2 ? r * 0.45 : r; const a = (Math.PI / n) * i - Math.PI / 2; ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } ctx.closePath(); }
