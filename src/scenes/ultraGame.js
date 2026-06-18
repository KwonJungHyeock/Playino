// ultraGame.js — 메아리 동굴 (초음파 거리 센서 · 동굴 비행)
// 손을 센서에 가까이/멀리 하며 EDDIE의 우주선 높이를 조절해 동굴 틈을 통과한다.
//  └ 가까이(작은 cm) = 위로 ↑ · 멀리(큰 cm) = 아래로 ↓. 크리스털을 모으고 벽을 피해 끝까지!
// 입력: 실물 초음파(HC-SR04, Trig=D3·Echo=D4)로 진짜 거리 측정. 보드/펌웨어가 없으면
//        마우스 상하·화살표(↑↓)·터치로 거리를 흉내(폴백) → 항상 플레이 가능.
//  ※ 실제 센서값은 펌웨어가 'U<trig>:<echo>' 명령(거리 cm 응답)을 지원해야 읽힌다.
import { sfx } from '../app/sfx.js';
import { bgm } from '../app/bgm.js';
import { progress } from '../app/progress.js';
import { celebrateRoom } from './celebrate.js';
import { board } from '../app/board.js';

const PINS = { trig: 4, echo: 3 };   // 결선상 Trig=D4, Echo=D3 (커넥터 GND/D3/D4/VCC ↔ 센서 Gnd/Echo/Trig/Vcc)
const NEAR = 5, FAR = 40;       // 거리 매핑 범위(cm): 5cm=맨 위, 40cm=맨 아래
const CRAFT_R = 22, WALL_W = 46, TOP = 70;
const GAMES = [
  { key: 'easy', no: 1, name: '메아리 동굴', speed: 2.7, gapFrac: 0.36, spacing: 340, goal: 12, hp: 3, moving: false, crystalRate: 0.6 },
  { key: 'hard', no: 2, name: '깊은 메아리 동굴', speed: 3.5, gapFrac: 0.27, spacing: 300, goal: 16, hp: 3, moving: true, crystalRate: 0.7 },
];

const bgImg = new Image(); bgImg.src = '/brand/stage-ultra-bg.webp';
const headImg = new Image(); headImg.src = '/brand/eddie-pilot.webp';
const heroImg = new Image(); heroImg.src = '/brand/eddie/eddie-hero.webp';
const ready = (im) => im.complete && im.naturalWidth > 0;
const gradeOf = (a) => a >= 0.95 ? 'S' : a >= 0.85 ? 'A' : a >= 0.7 ? 'B' : a >= 0.5 ? 'C' : 'D';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function showUltraGame(root, { onExit } = {}) {
  root.innerHTML = `
    <div class="led scene-fade joygame ultragame">
      <div class="joy-stage-bg" id="ug-bg"></div>
      <div class="brand-badge"><span class="brand-dot"></span>Eduino&nbsp;<b>AI</b></div>
      <button class="snd-toggle" id="snd-toggle">${sfx.muted ? '🔇' : '🔊'}</button>
      <button class="bx-exit" id="ug-exit">✕ 전시관으로</button>
      <button class="bx-exit led-skip" id="ug-skip" hidden>⏭ 건너뛰기(테스트)</button>
      <div class="world-host" id="ug-host"></div>
      <div class="led-hud" id="ug-hud" hidden>
        <span class="lh-item" id="ug-stage">1단계</span>
        <span class="lh-item">💎 <b id="ug-crys">0</b>/<span id="ug-tot">0</span></span>
        <span class="lh-item">❤️ <b id="ug-hp">3</b></span>
        <span class="lh-item" id="ug-dist">📡 —</span>
      </div>
      <div class="led-prep" id="ug-prep">
        <div class="prep-card" style="max-width:720px">
          <h2>📡 메아리 동굴</h2>
          <p class="prep-sub">손을 초음파 센서에 <b>가까이/멀리</b> 하며 우주선 높이를 조절해요! 동굴 틈을 지나 <b>크리스털</b>을 모으고 벽을 피해 끝까지 가면 통과 🚀 (보드 없으면 마우스 상하·↑↓로도 가능)</p>
          <div class="prep-grid">
            <div class="prep-img" id="ug-wimg"><span class="prep-img-ph">📡 결선 사진</span></div>
            <div class="prep-side">
              <table class="prep-table">
                <thead><tr><th>HC-SR04</th><th>아두이노 (12번 포트)</th></tr></thead>
                <tbody>
                  <tr><td>Gnd</td><td>GND</td></tr>
                  <tr><td>Trig</td><td>D4</td></tr>
                  <tr><td>Echo</td><td>D3</td></tr>
                  <tr><td>Vcc</td><td>VCC(5V)</td></tr>
                </tbody>
              </table>
              <div class="prep-status">센서 앞에 손을 대고 <b>가까이=위로 ↑</b>, <b>멀리=아래로 ↓</b>! 초음파가 소리를 쏘고 메아리로 거리를 재요 📡</div>
            </div>
          </div>
          <div class="prep-actions" style="justify-content:center">
            <button class="prep-btn" id="ug-connect">🔌 보드 연결(선택)</button>
            <button class="cel-go" id="ug-start">결선 완료 · 시작 ▶</button>
          </div>
        </div>
      </div>
    </div>`;

  const scene = root.querySelector('.led');
  const bg = root.querySelector('#ug-bg');
  bgImg.onload = () => { bg.style.backgroundImage = `url(${bgImg.src})`; };
  if (ready(bgImg)) bg.style.backgroundImage = `url(${bgImg.src})`;
  const wImg = new Image();
  wImg.onload = () => { const e = root.querySelector('#ug-wimg'); if (e) { e.style.backgroundImage = `url(${wImg.src})`; e.classList.add('has-img'); } };
  wImg.src = '/brand/wiring-sr04.webp';
  const host = root.querySelector('#ug-host');
  const canvas = document.createElement('canvas'); canvas.className = 'world-canvas'; host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const snd = root.querySelector('#snd-toggle'); snd.onclick = () => { const m = sfx.toggle(); snd.textContent = m ? '🔇' : '🔊'; };
  root.querySelector('#ug-exit').onclick = () => { cleanup(); onExit?.(); };
  const elCrys = root.querySelector('#ug-crys'), elTot = root.querySelector('#ug-tot'), elHp = root.querySelector('#ug-hp'), elStage = root.querySelector('#ug-stage'), elDist = root.querySelector('#ug-dist');
  const hud = root.querySelector('#ug-hud'), skipBtn = root.querySelector('#ug-skip');

  let W = 0, H = 0;
  function resize() { W = canvas.width = host.clientWidth || window.innerWidth; H = canvas.height = host.clientHeight || 600; }
  resize(); window.addEventListener('resize', resize);
  const playTop = () => TOP, playH = () => Math.max(120, H - TOP);

  // ── 입력 ──
  const keys = new Set();
  const onKeyDown = (e) => { const k = e.key.toLowerCase(); if (['arrowup', 'arrowdown', 'w', 's'].includes(k)) { e.preventDefault(); keys.add(k); } };
  const onKeyUp = (e) => keys.delete(e.key.toLowerCase());
  window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp);
  let manualNorm = 0.5, manualAt = 0;
  const onPointer = (e) => { const r = canvas.getBoundingClientRect(); manualNorm = clamp((e.clientY - r.top - playTop()) / playH(), 0, 1); manualAt = performance.now(); };
  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); onPointer(e); });
  canvas.addEventListener('pointermove', (e) => { if (e.pressure > 0 || e.pointerType === 'mouse') onPointer(e); });

  // 실물 초음파(HC-SR04) 폴링 → 거리 cm. 펌웨어가 U 명령을 지원하면 값이 들어온다.
  let hwTimer = null, hwCm = null, hwSmooth = null, hwAt = 0;
  function startHw() {
    stopHw(); if (!board.connected) return;
    hwTimer = setInterval(async () => {
      const cm = await board.readUltrasonic({ trig: PINS.trig, echo: PINS.echo });
      if (cm != null && cm > 0) { hwSmooth = hwSmooth == null ? cm : hwSmooth + (cm - hwSmooth) * 0.5; hwCm = hwSmooth; hwAt = performance.now(); }
    }, 90);
  }
  function stopHw() { if (hwTimer) { clearInterval(hwTimer); hwTimer = null; } hwCm = null; hwSmooth = null; }
  const hwActive = () => hwCm != null && (performance.now() - hwAt) < 900;
  const hwNorm = () => clamp((hwCm - NEAR) / (FAR - NEAR), 0, 1);

  root.querySelector('#ug-connect').onclick = async () => { const b = root.querySelector('#ug-connect'); try { await board.connect(); b.textContent = '🔌 연결됨 ✓'; startHw(); } catch (e) { b.textContent = board.classify(e).note.slice(0, 16) + '…'; } };
  board.connectAuto().then(() => startHw()).catch(() => {});
  root.querySelector('#ug-start').onclick = () => { root.querySelector('#ug-prep').classList.add('hide'); skipBtn.hidden = false; startFlow(); };

  // ── 플로우 ──
  const cleared = { easy: false, hard: false };
  let gi = 0, game = GAMES[0], craft = null, obs = [], parts = [];
  const state = { phase: 'prep', countT: 0, crystals: 0, crystalTot: 0, hp: 3, passed: 0, norm: 0.5, ended: false };
  function panel(html) { const el = document.createElement('div'); el.className = 'led-panel'; el.innerHTML = `<div class="prep-card led-pcard">${html}</div>`; scene.appendChild(el); return el; }
  function startFlow() { gi = 0; nextGame(); }
  function nextGame() { if (gi >= GAMES.length) { finishAll(); return; } game = GAMES[gi]; showIntro(); }
  function showIntro() {
    bgm.setDuck(1); hud.hidden = true;
    const el = panel(`<div class="lp-no">${game.no} / ${GAMES.length} 단계</div><h2>📡 ${game.name}</h2>
      <p class="prep-sub">손 거리로 우주선 높이를 맞춰 동굴 틈을 ${game.goal}개 통과해요! <b>가까이=위 ↑ · 멀리=아래 ↓</b>${game.moving ? ' · 움직이는 틈 주의 🌀' : ''}<br>💎 크리스털을 모으고 ❤️ 3번까지 부딪혀도 괜찮아요!</p>
      <p class="lp-cond">끝까지 도달하면 통과! 크리스털을 많이 모을수록 높은 등급 🏅</p><button class="cel-go" id="lp-go">시작 ▶</button>`);
    el.querySelector('#lp-go').onclick = () => { el.remove(); beginPlay(); };
  }
  function beginPlay() {
    bgm.setDuck(0);
    craft = { x: W * 0.28, y: playTop() + playH() / 2, inv: 0 };
    obs = []; parts = []; let cryTot = 0;
    for (let i = 0; i < game.goal; i++) {
      const c0 = 0.26 + Math.random() * 0.48;
      const crystal = Math.random() < game.crystalRate ? { got: false } : null;
      if (crystal) cryTot++;
      obs.push({ x: W * 0.95 + i * game.spacing, c0, c: c0, crystal, moving: game.moving, ph: Math.random() * 6.283, passed: false });
    }
    Object.assign(state, { phase: 'count', countT: performance.now(), crystals: 0, crystalTot: cryTot, hp: game.hp, passed: 0, norm: 0.5, ended: false });
    elTot.textContent = cryTot; elStage.textContent = `${game.no}단계 · ${game.name}`; sync();
    hud.hidden = false;
  }
  function showResult(grade, pass) {
    bgm.setDuck(1); const last = gi === GAMES.length - 1; const pct = state.crystalTot ? Math.round(state.crystals / state.crystalTot * 100) : 100;
    const el = panel(`<div class="lp-grade lp-${grade}">${grade}<span>등급</span></div><h2>${pass ? '동굴 탈출! 🎉' : '추락! ☄️'}</h2>
      <p class="prep-sub">${game.name} · 💎 ${state.crystals}/${state.crystalTot} (${pct}%) · ❤️ ${state.hp} 남음</p>
      <p class="lp-cond">${pass ? (last ? '두 동굴 클리어! 메달을 받자 🏅' : '다음 동굴로 ▶') : '❤️를 다 잃었어요 — 다시 도전!'}</p>
      <button class="cel-go" id="lp-next">${pass ? (last ? '메달 받기 🏅' : '다음 동굴 ▶') : '다시 도전 ▶'}</button>`);
    el.querySelector('#lp-next').onclick = () => { el.remove(); if (pass) { cleared[game.key] = true; gi++; nextGame(); } else beginPlay(); };
  }
  function finishAll() {
    cleanup();
    if (cleared.easy && cleared.hard) { progress.mark('ultra'); celebrateRoom({ title: '메아리 탐험가! 📡', message: '손 거리(초음파)로 우주선을 조종해 동굴을 빠져나왔어요 — 📡 메아리 메달 획득!', exitLabel: '전시관으로 ▶', onExit: () => onExit?.() }); }
    else onExit?.();
  }
  skipBtn.onclick = () => { document.querySelectorAll('.led-panel').forEach((e) => e.remove()); cleared[game.key] = true; state.ended = true; state.phase = 'result'; bgm.setDuck(1); gi++; nextGame(); };
  function sync() { elCrys.textContent = state.crystals; elHp.textContent = state.hp; }
  function burst(x, y, c, n = 12) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = 1 + Math.random() * 4; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 34, color: c }); } }
  function endPlay(win) { if (state.ended) return; state.ended = true; state.phase = 'result'; const cr = state.crystalTot ? state.crystals / state.crystalTot : 1, hpR = state.hp / game.hp; showResult(win ? gradeOf(0.5 + cr * 0.4 + hpR * 0.1) : 'D', win); }
  function hit(gapCenter) {
    state.hp--; craft.inv = 78; craft.y += (gapCenter - craft.y) * 0.55; manualNorm = clamp((craft.y - playTop() - CRAFT_R) / (playH() - 2 * CRAFT_R), 0, 1);
    burst(craft.x, craft.y, '255,140,140', 18); sfx.no(); sync();
    if (state.hp <= 0) endPlay(false);
  }

  let lastT = performance.now();
  function update(dt) {
    if (state.phase !== 'play' || state.ended) return;
    const now = performance.now();
    if (keys.has('arrowup') || keys.has('w')) { manualNorm -= 0.028 * dt; manualAt = now; }
    if (keys.has('arrowdown') || keys.has('s')) { manualNorm += 0.028 * dt; manualAt = now; }
    manualNorm = clamp(manualNorm, 0, 1);
    const norm = hwActive() ? hwNorm() : manualNorm;
    state.norm = norm;
    const targetY = playTop() + CRAFT_R + norm * (playH() - 2 * CRAFT_R);
    craft.y += (targetY - craft.y) * Math.min(1, 0.22 * dt);
    if (craft.inv > 0) craft.inv -= dt;
    const sp = game.speed * dt, gapHpx = playH() * game.gapFrac;
    for (const o of obs) {
      o.x -= sp;
      if (o.moving) o.c = clamp(o.c0 + Math.sin(now * 0.002 + o.ph) * 0.16, 0.2, 0.8);
      const gapCenter = playTop() + o.c * playH();
      if (!o.passed && o.x < craft.x) { o.passed = true; state.passed++; sfx.note(620, 90); }
      if (o.crystal && !o.crystal.got && Math.abs(o.x - craft.x) < CRAFT_R + 12 && Math.abs(gapCenter - craft.y) < CRAFT_R + 16) {
        o.crystal.got = true; state.crystals++; sfx.note(760 + Math.min(8, state.crystals) * 30, 150); burst(o.x, gapCenter, '150,230,255', 10); sync();
      }
      if (craft.inv <= 0 && Math.abs(o.x - craft.x) < WALL_W / 2 + CRAFT_R) {
        const top = gapCenter - gapHpx / 2, bot = gapCenter + gapHpx / 2;
        if (craft.y - CRAFT_R < top || craft.y + CRAFT_R > bot) { hit(gapCenter); if (state.ended) return; }
      }
    }
    if (state.passed >= game.goal) { endPlay(true); return; }
  }
  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    if (!ready(bgImg)) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0d2230'); g.addColorStop(1, '#06121c'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    else { ctx.fillStyle = 'rgba(6,18,28,0.34)'; ctx.fillRect(0, 0, W, H); }
    const pT = playTop(), pH = playH(), gapHpx = pH * game.gapFrac;
    // 진행 바
    if (state.phase !== 'prep') { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(0, pT - 6, W, 4); ctx.fillStyle = 'rgba(150,230,255,.85)'; ctx.fillRect(0, pT - 6, W * (state.passed / game.goal), 4); }
    // 동굴 벽 + 크리스털
    for (const o of obs) {
      if (o.x < -WALL_W || o.x > W + WALL_W) continue;
      const gc = pT + o.c * pH, top = gc - gapHpx / 2, bot = gc + gapHpx / 2, x = o.x - WALL_W / 2;
      ctx.save(); ctx.fillStyle = 'rgba(40,70,92,0.92)'; ctx.strokeStyle = 'rgba(120,200,230,0.5)'; ctx.lineWidth = 2;
      ctx.fillRect(x, pT, WALL_W, top - pT); ctx.strokeRect(x, pT - 2, WALL_W, top - pT + 2);
      ctx.fillRect(x, bot, WALL_W, H - bot); ctx.strokeRect(x, bot, WALL_W, H - bot);
      ctx.restore();
      if (o.crystal && !o.crystal.got) { const tw = 0.7 + 0.3 * Math.sin(now * 0.006 + o.ph); ctx.save(); ctx.globalAlpha = tw; ctx.fillStyle = '#9fe8ff'; ctx.shadowColor = 'rgba(150,230,255,.9)'; ctx.shadowBlur = 14; gem(ctx, o.x, gc, 13); ctx.fill(); ctx.restore(); }
    }
    // 우주선(에디) + 소나 핑
    if (craft) {
      if (state.phase === 'play') { const pr = (now * 0.05) % 60; ctx.save(); ctx.globalAlpha = Math.max(0, 1 - pr / 60) * 0.4; ctx.strokeStyle = '#7fe6ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(craft.x, craft.y, CRAFT_R + pr, 0, 6.283); ctx.stroke(); ctx.restore(); }
      const img = ready(headImg) ? headImg : (ready(heroImg) ? heroImg : null), s = CRAFT_R * 2.7;
      if (img) { const w = s * (img.naturalWidth / img.naturalHeight); ctx.save(); ctx.translate(craft.x, craft.y); ctx.globalAlpha = craft.inv > 0 ? 0.4 + 0.4 * Math.abs(Math.sin(now * 0.03)) : 1; ctx.drawImage(img, -w / 2, -s / 2, w, s); ctx.restore(); }
      else { ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(craft.x, craft.y, CRAFT_R, 0, 6.283); ctx.fill(); }
    }
    // 거리 게이지(좌측)
    if (state.phase !== 'prep') {
      const gx = 22, gy = pT + 6, gh = pH - 12;
      ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(gx, gy, 6, gh);
      const my = gy + state.norm * gh; ctx.fillStyle = hwActive() ? '#7fe6ff' : '#ffd24a'; ctx.beginPath(); ctx.arc(gx + 3, my, 8, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '700 11px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('가까이↑', gx + 14, gy + 10); ctx.fillText('멀리↓', gx + 14, gy + gh);
    }
    // 파티클
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.life--; ctx.globalAlpha = Math.max(0, p.life / 34); ctx.fillStyle = `rgb(${p.color})`; ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; if (p.life <= 0) parts.splice(i, 1); }
    // 카운트다운
    if (state.phase === 'count') { const el = (now - state.countT) / 1000, n = 3 - Math.floor(el); ctx.fillStyle = '#fff'; ctx.font = '900 90px "Space Grotesk",sans-serif'; ctx.textAlign = 'center'; ctx.fillText(n > 0 ? String(n) : 'GO!', W / 2, H * 0.5); if (el >= 3) state.phase = 'play'; }
    // HUD 거리 표시
    if (!hud.hidden) elDist.textContent = hwActive() ? `📡 ${Math.round(hwCm)}cm` : '🖱️ 화면';
  }
  function loop(now) { const dt = Math.min(2.4, (now - lastT) / 16.67); lastT = now; update(dt); draw(now); raf = requestAnimationFrame(loop); }
  let raf = requestAnimationFrame(loop);
  function cleanup() { bgm.setDuck(1); cancelAnimationFrame(raf); stopHw(); window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('resize', resize); }
}

function gem(ctx, cx, cy, r) { ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.8, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.8, cy); ctx.closePath(); }
