// joystickGame.js — 별 지렁이 대모험 (조이스틱 · 스네이크형)
// 조이스틱으로 우주뱀(EDDIE)을 조종해 별을 먹는다. 별을 먹을수록 꼬리가 길어지고
// 속도가 빨라져 점점 어려워진다(자기 꼬리·운석 충돌 = 크래시).
// 입력: 키보드(방향키/WASD) · 화면 조이스틱(터치) · 실물 조이스틱(A0=X, A1=Y).
// 1차 별 지렁이 · 2차 운석 미로. 목표 길이 도달(또는 85%↑) → 🚀 조종 메달.
import { sfx } from '../app/sfx.js';
import { bgm } from '../app/bgm.js';
import { progress } from '../app/progress.js';
import { celebrateRoom } from './celebrate.js';
import { board } from '../app/board.js';

const PINS = { x: 0, y: 1 }, PASS_ACC = 0.85, GAP = 6;
const GAMES = [
  { key: 'easy', no: 1, name: '별 지렁이', target: 12, speed: 2.7, turn: 0.10, rocks: 3, rockSpd: 1.2, selfAt: 8 },
  { key: 'hard', no: 2, name: '운석 미로', target: 18, speed: 3.5, turn: 0.12, rocks: 7, rockSpd: 2.2, selfAt: 6 },
];

const bgImg = new Image(); bgImg.src = '/brand/stage-joystick-bg.webp';
const headImg = new Image(); headImg.src = '/brand/eddie-pilot.webp';
const heroImg = new Image(); heroImg.src = '/brand/eddie/eddie-hero.webp';
const ready = (im) => im.complete && im.naturalWidth > 0;
const gradeOf = (a) => a >= 0.95 ? 'S' : a >= 0.85 ? 'A' : a >= 0.7 ? 'B' : a >= 0.5 ? 'C' : 'D';
const HEAD_R = 37;

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
        <span class="lh-item">🐛 길이 <b id="jy-len">3</b></span>
      </div>
      <div class="joy-pad" id="jy-pad" hidden><div class="joy-knob"></div></div>
      <div class="led-prep" id="jy-prep">
        <div class="prep-card" style="max-width:700px">
          <h2>🚀 별 지렁이 대모험</h2>
          <p class="prep-sub">조이스틱으로 우주뱀을 조종해 <b>별을 먹어요</b>! 먹을수록 <b>꼬리가 길어지고 빨라져요</b> — 자기 꼬리·운석을 피해 목표만큼 모으면 통과 ⭐</p>
          <div class="prep-grid">
            <div class="prep-img" id="jy-wimg"><span class="prep-img-ph">🕹️ 결선 사진</span></div>
            <div class="prep-side">
              <table class="prep-table">
                <thead><tr><th>조이스틱 핀</th><th>아두이노</th></tr></thead>
                <tbody>
                  <tr><td>VCC</td><td>5V</td></tr>
                  <tr><td>GND</td><td>GND</td></tr>
                  <tr><td>X</td><td>A0</td></tr>
                  <tr><td>Y</td><td>A1</td></tr>
                  <tr><td>SW(버튼)</td><td>D2</td></tr>
                </tbody>
              </table>
              <div class="prep-status">조작: 화면 조이스틱(왼쪽 아래) · 방향키/WASD · 실물(X→A0·Y→A1)</div>
            </div>
          </div>
          <div class="prep-actions" style="justify-content:center">
            <button class="prep-btn" id="jy-connect">🔌 보드 연결(선택)</button>
            <button class="cel-go" id="jy-start">결선 완료 · 시작 ▶</button>
          </div>
        </div>
      </div>
    </div>`;

  const scene = root.querySelector('.led');
  const bg = root.querySelector('#jy-bg');
  bgImg.onload = () => { bg.style.backgroundImage = `url(${bgImg.src})`; };
  if (ready(bgImg)) bg.style.backgroundImage = `url(${bgImg.src})`;
  const wImg = new Image();
  wImg.onload = () => { const e = root.querySelector('#jy-wimg'); if (e) { e.style.backgroundImage = `url(${wImg.src})`; e.classList.add('has-img'); } };
  wImg.src = '/brand/wiring-joystick.webp';
  const host = root.querySelector('#jy-host');
  const canvas = document.createElement('canvas'); canvas.className = 'world-canvas'; host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const snd = root.querySelector('#snd-toggle'); snd.onclick = () => { const m = sfx.toggle(); snd.textContent = m ? '🔇' : '🔊'; };
  root.querySelector('#jy-exit').onclick = () => { cleanup(); onExit?.(); };
  const elStar = root.querySelector('#jy-star'), elTot = root.querySelector('#jy-tot'), elLen = root.querySelector('#jy-len'), elStage = root.querySelector('#jy-stage');
  const hud = root.querySelector('#jy-hud'), pad = root.querySelector('#jy-pad'), skipBtn = root.querySelector('#jy-skip');

  let W = 0, H = 0;
  function resize() { W = canvas.width = host.clientWidth || window.innerWidth; H = canvas.height = host.clientHeight || 600; }
  resize(); window.addEventListener('resize', resize);

  // ── 입력 ──
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
  let hwTimer = null, hw = { x: 0, y: 0 };
  function startHw() { stopHw(); if (!board.connected) return; hwTimer = setInterval(async () => { const vx = await board.analogRead(PINS.x); const vy = await board.analogRead(PINS.y); if (vx != null) hw.x = Math.abs(vx - 512) < 90 ? 0 : (vx - 512) / 512; if (vy != null) hw.y = Math.abs(vy - 512) < 90 ? 0 : (vy - 512) / 512; }, 110); }
  function stopHw() { if (hwTimer) { clearInterval(hwTimer); hwTimer = null; } hw.x = 0; hw.y = 0; }
  function inputVec() {
    let x = 0, y = 0;
    if (keys.has('arrowleft') || keys.has('a')) x -= 1; if (keys.has('arrowright') || keys.has('d')) x += 1;
    if (keys.has('arrowup') || keys.has('w')) y -= 1; if (keys.has('arrowdown') || keys.has('s')) y += 1;
    if (joy.x || joy.y) { x = joy.x; y = joy.y; } else if (hw.x || hw.y) { x = hw.x; y = hw.y; }
    return { x, y };
  }

  root.querySelector('#jy-connect').onclick = async () => { const b = root.querySelector('#jy-connect'); try { await board.connect(); b.textContent = '🔌 연결됨 ✓'; startHw(); } catch (e) { b.textContent = board.classify(e).note.slice(0, 16) + '…'; } };
  board.connectAuto().then(() => startHw()).catch(() => {});
  root.querySelector('#jy-start').onclick = () => { root.querySelector('#jy-prep').classList.add('hide'); skipBtn.hidden = false; startFlow(); };

  // ── 플로우 ──
  const cleared = { easy: false, hard: false };
  let gi = 0, game = GAMES[0], S = null, stars = [], rocks = [], parts = [];
  const state = { phase: 'prep', countT: 0, collected: 0, target: 0, ended: false };
  function panel(html) { const el = document.createElement('div'); el.className = 'led-panel'; el.innerHTML = `<div class="prep-card led-pcard">${html}</div>`; scene.appendChild(el); return el; }
  function startFlow() { gi = 0; nextGame(); }
  function nextGame() { if (gi >= GAMES.length) { finishAll(); return; } game = GAMES[gi]; showIntro(); }
  function showIntro() {
    bgm.setDuck(1); hud.hidden = true; pad.hidden = true;
    const el = panel(`<div class="lp-no">${game.no} / ${GAMES.length} 단계</div><h2>🐛 ${game.name}</h2>
      <p class="prep-sub">별을 <b>${game.target}개</b> 먹어 우주뱀을 키워요! 꼬리가 길어질수록 빨라지고 — <b>자기 꼬리와 운석</b>에 부딪히면 크래시 ☄️</p>
      <p class="lp-cond">⭐ <b>${Math.ceil(game.target * PASS_ACC)}개 이상</b>(A등급) 먹으면 통과!</p><button class="cel-go" id="lp-go">시작 ▶</button>`);
    el.querySelector('#lp-go').onclick = () => { el.remove(); beginPlay(); };
  }
  function spawnStar() {
    let x, y, ok, tries = 0;
    do { x = 50 + Math.random() * (W - 100); y = 70 + Math.random() * (H - 130); ok = !S || Math.hypot(S.x - x, S.y - y) > 120; } while (!ok && ++tries < 20);
    stars.push({ x, y, t: performance.now() });
  }
  function beginPlay() {
    bgm.setDuck(0); pad.hidden = false;
    S = { x: W / 2, y: H / 2, ang: 0, hist: [], len: 4 };
    stars = []; rocks = []; parts = [];
    for (let i = 0; i < game.rocks; i++) { const a = Math.random() * 6.283; rocks.push({ x: Math.random() * W, y: 80 + Math.random() * (H - 120), vx: Math.cos(a) * game.rockSpd, vy: Math.sin(a) * game.rockSpd, r: 20 + Math.random() * 14 }); }
    Object.assign(state, { phase: 'count', countT: performance.now(), collected: 0, target: game.target, ended: false });
    elTot.textContent = game.target; elStage.textContent = `${game.no}단계 · ${game.name}`; sync();
    hud.hidden = false; spawnStar(); spawnStar();
  }
  function showResult(grade, pass) {
    bgm.setDuck(1); pad.hidden = true; const last = gi === GAMES.length - 1; const pct = Math.round(state.collected / state.target * 100);
    const el = panel(`<div class="lp-grade lp-${grade}">${grade}<span>등급</span></div><h2>${pass ? '통과! 🎉' : '조금만 더!'}</h2>
      <p class="prep-sub">${game.name} · 별 ${state.collected}/${state.target} (${pct}%) · 꼬리 길이 ${S ? S.len : 0}</p>
      <p class="lp-cond">${pass ? (last ? '두 미션 완성! 메달을 받자 🏅' : '다음 미션으로 ▶') : 'A등급(85%↑)이어야 통과! 다시 도전!'}</p>
      <button class="cel-go" id="lp-next">${pass ? (last ? '메달 받기 🏅' : '다음 미션 ▶') : '다시 도전 ▶'}</button>`);
    el.querySelector('#lp-next').onclick = () => { el.remove(); if (pass) { cleared[game.key] = true; gi++; nextGame(); } else beginPlay(); };
  }
  function finishAll() {
    cleanup();
    if (cleared.easy && cleared.hard) { progress.mark('joystick'); celebrateRoom({ title: '우주 파일럿! 🚀', message: '조이스틱으로 우주뱀을 키우며 별을 모았어요 — 🚀 조종 메달 획득!', exitLabel: '전시관으로 ▶', onExit: () => onExit?.() }); }
    else onExit?.();
  }
  skipBtn.onclick = () => { document.querySelectorAll('.led-panel').forEach((e) => e.remove()); cleared[game.key] = true; state.ended = true; state.phase = 'result'; bgm.setDuck(1); gi++; nextGame(); };
  function sync() { elStar.textContent = state.collected; elLen.textContent = S ? S.len : 3; }
  function burst(x, y, c, n = 12) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 1 + Math.random() * 4; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 34, color: c }); } }
  function endPlay() { if (state.ended) return; state.ended = true; state.phase = 'result'; const acc = state.collected / state.target; showResult(gradeOf(acc), acc >= PASS_ACC); }
  function crash(x, y) { burst(x, y, '255,140,140', 22); sfx.no(); endPlay(); }

  let lastT = performance.now();
  function update(dt) {
    if (state.phase !== 'play' || state.ended) return;
    const v = inputVec();
    if (Math.hypot(v.x, v.y) > 0.25) {
      const tAng = Math.atan2(v.y, v.x); let diff = tAng - S.ang;
      while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
      const turn = game.turn * dt; S.ang += Math.max(-turn, Math.min(turn, diff));
    }
    const sp = (game.speed + state.collected * 0.09) * dt;
    S.x += Math.cos(S.ang) * sp; S.y += Math.sin(S.ang) * sp;
    if (S.x < 0) S.x += W; if (S.x > W) S.x -= W; if (S.y < 40) S.y += (H - 40); if (S.y > H) S.y -= (H - 40);
    S.hist.unshift({ x: S.x, y: S.y }); const maxh = S.len * GAP + 14; if (S.hist.length > maxh) S.hist.length = maxh;
    // 별
    for (const s of stars) { if (s.got) continue; if (Math.hypot(S.x - s.x, S.y - s.y) < HEAD_R + 13) { s.got = true; state.collected++; S.len += 2; sfx.note(540 + Math.min(10, state.collected) * 30, 150); burst(s.x, s.y, '255,220,90', 10); sync(); if (state.collected >= state.target) { endPlay(); return; } spawnStar(); } }
    stars = stars.filter((s) => !s.got);
    // 운석
    for (const k of rocks) { k.x += k.vx * dt; k.y += k.vy * dt; if (k.x < k.r || k.x > W - k.r) k.vx *= -1; if (k.y < k.r + 40 || k.y > H - k.r) k.vy *= -1; if (Math.hypot(S.x - k.x, S.y - k.y) < k.r + HEAD_R - 6) { crash(S.x, S.y); return; } }
    // 자기 꼬리
    for (let i = game.selfAt; i < S.len; i++) { const seg = S.hist[i * GAP]; if (seg && Math.hypot(S.x - seg.x, S.y - seg.y) < 18) { crash(S.x, S.y); return; } }
  }
  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    if (!ready(bgImg)) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a1640'); g.addColorStop(1, '#0a0820'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    else { ctx.fillStyle = 'rgba(10,8,26,0.22)'; ctx.fillRect(0, 0, W, H); }
    if (state.phase === 'count') { const el = (now - state.countT) / 1000, n = 3 - Math.floor(el); ctx.fillStyle = '#fff'; ctx.font = '900 90px "Space Grotesk",sans-serif'; ctx.textAlign = 'center'; ctx.fillText(n > 0 ? String(n) : 'GO!', W / 2, H * 0.5); if (el >= 3) { state.phase = 'play'; } }
    // 먹을 별
    for (const s of stars) { if (s.got) continue; const tw = 0.7 + 0.3 * Math.sin(now * 0.006 + s.t); ctx.save(); ctx.globalAlpha = tw; ctx.fillStyle = '#ffe066'; ctx.shadowColor = 'rgba(255,220,90,.9)'; ctx.shadowBlur = 16; star(ctx, s.x, s.y, 15, 5); ctx.fill(); ctx.restore(); }
    // 운석
    for (const k of rocks) { ctx.save(); ctx.fillStyle = '#8a8496'; ctx.strokeStyle = '#5a5568'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(k.x, k.y, k.r, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#6f6a7e'; ctx.beginPath(); ctx.arc(k.x - k.r * 0.3, k.y - k.r * 0.2, k.r * 0.22, 0, 6.283); ctx.fill(); ctx.restore(); }
    // 꼬리(별)
    if (S) {
      for (let i = S.len; i >= 1; i--) {
        const seg = S.hist[Math.min(S.hist.length - 1, i * GAP)]; if (!seg) continue;
        const r = 15 - Math.min(7, i * 0.4);
        ctx.save(); ctx.globalAlpha = 0.92; ctx.fillStyle = i <= game.selfAt ? '#9fe0ff' : '#ffd24a'; ctx.shadowColor = 'rgba(150,200,255,.7)'; ctx.shadowBlur = 8; star(ctx, seg.x, seg.y, Math.max(6, r), 5); ctx.fill(); ctx.restore();
      }
      // 머리(에디)
      const img = ready(headImg) ? headImg : (ready(heroImg) ? heroImg : null);
      const s = HEAD_R * 2.7;
      if (img) { const w = s * (img.naturalWidth / img.naturalHeight); ctx.save(); ctx.translate(S.x, S.y); ctx.drawImage(img, -w / 2, -s / 2, w, s); ctx.restore(); }
      else { ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(S.x, S.y, HEAD_R, 0, 6.283); ctx.fill(); }
    }
    // 파티클
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.life--; ctx.globalAlpha = Math.max(0, p.life / 34); ctx.fillStyle = `rgb(${p.color})`; ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; if (p.life <= 0) parts.splice(i, 1); }
  }
  function loop(now) { const dt = Math.min(2.4, (now - lastT) / 16.67); lastT = now; update(dt); draw(now); raf = requestAnimationFrame(loop); }
  let raf = requestAnimationFrame(loop);
  function cleanup() { bgm.setDuck(1); cancelAnimationFrame(raf); stopHw(); window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('resize', resize); }
}

function star(ctx, cx, cy, r, n) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const rad = i % 2 ? r * 0.45 : r; const a = (Math.PI / n) * i - Math.PI / 2; ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } ctx.closePath(); }
