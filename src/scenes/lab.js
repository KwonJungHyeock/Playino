// lab.js — 연구소 복도 (오버월드). 양쪽 문마다 구성품(센서). LED만 개방.
// LED 문 상호작용 → 결선 안내 창 → 완료 시 LED 학습방(집)으로.

import { createWorld } from '../engine/topdown.js';
import { mountQuest } from '../app/quest.js';
import { openWiring } from './wiring.js';
import { WIRING } from '../content/wiring.js';
import { SENSORS } from '../content/sensors.js';
import { progress } from '../app/progress.js';
import { mountSay, eddieRandom } from '../app/eddieSay.js';
import { showFinale } from './finale.js';
import { vignette, chip, lightPool, roundRect } from '../engine/style.js';

let finaleShown = false;

const MAP_H = 560;
const DOOR_W = 120, GAP = 210, START = 80;
const TOP_Y = 200, BOT_Y = 316;   // 복도 안 트리거 y (벽 앞)

export function showLab(root, { onEnter, spawnAt } = {}) {
  // 문 배치: 앞쪽 절반은 위, 나머지는 아래
  const topN = Math.ceil(SENSORS.length / 2);
  const doors = SENSORS.map((s, i) => {
    const top = i < topN;
    const k = top ? i : i - topN;
    return { ...s, top, x: START + k * GAP, y: top ? TOP_Y : BOT_Y };
  });
  const MAP_W = START + Math.max(topN, SENSORS.length - topN) * GAP + 80;
  // 방에서 나오면 들어갔던 문 앞(복도)에서 등장 (연속성)
  let spawnPt = { x: 120, y: 268 };
  if (spawnAt) { const d = doors.find((x) => x.id === spawnAt); if (d) spawnPt = { x: d.x + DOOR_W / 2 - 14, y: 268 }; }

  root.innerHTML = `
    <div class="scene game-scene scene-fade">
      <div class="world-host" id="world-host"></div>
      <div class="hud-top">
        <div class="brand"><span class="brand-dot"></span><strong>Eduino AI</strong><span class="brand-sep">:</span><b class="brand-sub">스타터 키트</b><span class="crumb">연구소 복도</span></div>
        <div class="phase-badge">학습 진척 <span id="lab-prog">${progress.count()} / ${progress.total()}</span></div>
      </div>
      <div class="hud-hint" id="hud-hint"></div>
      <div class="hud-toast" id="hud-toast"></div>
      <div class="hud-controls">⬅➡ 이동 · Space 입장 · EDDIE 클릭!</div>
    </div>
  `;
  const hintEl = root.querySelector('#hud-hint');
  const toastEl = root.querySelector('#hud-toast');
  const say = mountSay(root.querySelector('.game-scene'));

  // 모든 학습 완료 시 폭죽 피날레(세션 1회)
  if (progress.allDone() && !finaleShown) { finaleShown = true; setTimeout(() => showFinale({}), 500); }

  mountQuest(root.querySelector('.game-scene'), {
    title: '학습방 찾기',
    subtitle: '연구소 복도에서 오늘의 방으로!',
    objectives: [{ text: '💡 LED 학습방에 입장하기', done: false }, { text: '나머지 구성품 — 곧 열림 🔒', done: false }],
  });

  const map = {
    width: MAP_W, height: MAP_H, bg: '#0a1020',
    spawn: spawnPt,
    walls: [
      { x: 0, y: 0, w: MAP_W, h: 188 },
      { x: 0, y: 372, w: MAP_W, h: MAP_H - 372 },
      { x: 0, y: 0, w: 18, h: MAP_H },
      { x: MAP_W - 18, y: 0, w: 18, h: MAP_H },
    ],
    triggers: doors.map((d) => ({ id: d.id, x: d.x, y: d.y, w: DOOR_W, h: 50 })),
    draw: (ctx, st) => drawLab(ctx, st, doors, MAP_W),
  };

  const world = createWorld(root.querySelector('#world-host'), map, {
    onInteract: handle,
    onFrame: updateHint,
    onEddieClick: (x, y) => say(eddieRandom(), x, y),
    onDrawOverlay: (ctx, _s, canvas) => vignette(ctx, canvas, 0.46),
  });

  function enterRoom(id) {
    world.pause();
    const w = WIRING[id];
    const go = () => { world.destroy(); onEnter?.(id); };
    if (w) openWiring(w, { onDone: go, onClose: () => world.resume() });
    else go();
  }

  function handle(id) {
    const s = SENSORS.find((x) => x.id === id);
    if (!s || !s.unlocked) { toast(`🔒 ${s ? s.icon + ' ' + s.name : ''} 학습방 — 곧 열려요!`); return; }
    if (progress.isCleared(id)) {
      world.pause();
      confirmReenter(s, () => enterRoom(id), () => world.resume());
    } else {
      enterRoom(id);
    }
  }

  function confirmReenter(s, yes, no) {
    const m = document.createElement('div');
    m.className = 'modal-backdrop';
    m.innerHTML = `<div class="modal"><h3>✅ ${s.icon} ${s.name} — 클리어한 방</h3>
      <p>이미 학습을 마친 방이에요. <b>다시 학습할까요?</b></p>
      <div class="modal-actions"><button class="btn" id="re-no">아니오</button><button class="btn primary" id="re-yes">예, 다시 ▶</button></div></div>`;
    document.body.appendChild(m);
    m.querySelector('#re-no').onclick = () => { m.remove(); no(); };
    m.querySelector('#re-yes').onclick = () => { m.remove(); yes(); };
  }

  function updateHint(state) {
    const tr = state.activeTrigger;
    if (!tr) { hintEl.classList.remove('show'); return; }
    const s = SENSORS.find((x) => x.id === tr.id);
    if (!s) { hintEl.classList.remove('show'); return; }
    hintEl.innerHTML = s.unlocked ? `▶ Space · <b>${s.icon} ${s.name} 학습방</b> 입장` : `🔒 ${s.icon} ${s.name} (곧 열려요)`;
    hintEl.classList.add('show');
  }

  let tT = null;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => toastEl.classList.remove('show'), 2200); }
}

function drawLab(ctx, st, doors, MAP_W) {
  // 배경
  ctx.fillStyle = '#0a1326'; ctx.fillRect(0, 0, MAP_W, MAP_H);
  // 복도 바닥 (깊이 그라데이션 + 광택)
  const cf = ctx.createLinearGradient(0, 188, 0, 372);
  cf.addColorStop(0, '#1d2c50'); cf.addColorStop(0.5, '#26376a'); cf.addColorStop(1, '#1a2848');
  ctx.fillStyle = cf; ctx.fillRect(0, 188, MAP_W, 184);
  const sheen = ctx.createLinearGradient(0, 188, 0, 252);
  sheen.addColorStop(0, 'rgba(150,190,255,0.10)'); sheen.addColorStop(1, 'rgba(150,190,255,0)');
  ctx.fillStyle = sheen; ctx.fillRect(0, 188, MAP_W, 64);
  ctx.strokeStyle = 'rgba(130,170,255,0.07)'; ctx.lineWidth = 1;
  for (let x = 0; x < MAP_W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 190); ctx.lineTo(x, 370); ctx.stroke(); }
  for (let y = 212; y < 372; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_W, y); ctx.stroke(); }
  // 중앙 가이드 (글로우)
  ctx.save(); ctx.shadowColor = 'rgba(111,183,255,0.8)'; ctx.shadowBlur = 12;
  ctx.strokeStyle = 'rgba(111,183,255,0.5)'; ctx.setLineDash([20, 16]); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 280); ctx.lineTo(MAP_W, 280); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  // 벽 패널 (상/하)
  const band = (y, h) => { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#101a30'); g.addColorStop(1, '#0a1326'); ctx.fillStyle = g; ctx.fillRect(0, y, MAP_W, h); };
  band(0, 188); band(372, MAP_H - 372);
  ctx.strokeStyle = 'rgba(120,160,255,0.06)'; ctx.lineWidth = 1;
  for (let x = 0; x < MAP_W; x += 90) { ctx.strokeRect(x + 6, 26, 78, 134); ctx.strokeRect(x + 6, 400, 78, 120); }
  ctx.fillStyle = 'rgba(120,180,255,0.16)'; ctx.fillRect(0, 186, MAP_W, 2); ctx.fillRect(0, 372, MAP_W, 2);
  for (let x = 120; x < MAP_W; x += 240) { lightPool(ctx, x, 188, 130, '150,190,255', 0.10); lightPool(ctx, x, 372, 130, '150,190,255', 0.07); }

  // 문 (글래스 + 글로우 + 칩 명패 + 클리어 배지)
  ctx.textAlign = 'center';
  for (const d of doors) {
    const top = d.top, fx = d.x, fw = DOOR_W, fy = top ? 92 : 388, fh = 96, lit = d.unlocked, clr = progress.isCleared(d.id);
    const accent = clr ? '61,220,145' : lit ? '111,183,255' : '70,84,120';
    if (lit) { const lg = ctx.createRadialGradient(fx + fw / 2, fy + fh / 2, 6, fx + fw / 2, fy + fh / 2, 88); lg.addColorStop(0, `rgba(${accent},0.26)`); lg.addColorStop(1, `rgba(${accent},0)`); ctx.fillStyle = lg; ctx.fillRect(fx - 30, fy - 30, fw + 60, fh + 60); }
    const ff = ctx.createLinearGradient(fx, fy, fx, fy + fh); ff.addColorStop(0, lit ? '#2c3c68' : '#1a2236'); ff.addColorStop(1, lit ? '#1d2a4c' : '#141a2c');
    ctx.fillStyle = ff; roundRect(ctx, fx, fy, fw, fh, 12); ctx.fill();
    ctx.strokeStyle = `rgba(${accent},${lit ? 0.9 : 0.5})`; ctx.lineWidth = 2; roundRect(ctx, fx, fy, fw, fh, 12); ctx.stroke();
    const gg = ctx.createLinearGradient(0, fy + 12, 0, fy + fh - 12); gg.addColorStop(0, 'rgba(18,28,50,0.92)'); gg.addColorStop(1, lit ? 'rgba(255,222,130,0.16)' : 'rgba(18,24,42,0.92)');
    ctx.fillStyle = gg; roundRect(ctx, fx + 12, fy + 12, fw - 24, fh - 24, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(fx + 16, fy + 17); ctx.lineTo(fx + fw - 16, fy + 17); ctx.stroke();
    ctx.font = '30px sans-serif'; ctx.fillStyle = lit ? '#fff' : '#5a6788'; ctx.fillText(d.icon, fx + fw / 2, fy + fh / 2 + 4);
    if (clr) { ctx.save(); ctx.shadowColor = 'rgba(61,220,145,0.8)'; ctx.shadowBlur = 10; ctx.fillStyle = '#3ddc91'; ctx.beginPath(); ctx.arc(fx + fw - 14, fy + 14, 12, 0, 6.283); ctx.fill(); ctx.restore(); ctx.fillStyle = '#08210f'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('✓', fx + fw - 14, fy + 19); }
    const ny = top ? fy + fh + 6 : fy - 28;
    chip(ctx, fx + fw / 2, ny, (lit ? '' : '🔒 ') + d.name, { bg: clr ? 'rgba(61,220,145,0.18)' : lit ? 'rgba(111,183,255,0.16)' : 'rgba(18,24,42,0.82)', fg: clr ? '#bfffd9' : lit ? '#cfe6ff' : '#9aaccb' });
  }
  ctx.textAlign = 'start';
}
