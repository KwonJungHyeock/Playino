// house.js — 집 내부 씬. 깜깜한 현관 홀 + 좌우/상단 방문(잠금).
// 현관 조명 스위치(접촉 포인트) → 미션 룸. 완료 시 현관이 환해지고 진척 1/5.

import { createWorld } from '../engine/topdown.js';
import { openRoom } from './room.js';
import { mountQuest } from '../app/quest.js';
import { ENTRY_ROOM, TOTAL_ROOMS } from '../content/rooms.js';

const MAP_W = 1000;
const MAP_H = 640;
const SWITCH = { x: 466, y: 300, w: 64, h: 72 };

export function showHouse(root, { onBack } = {}) {
  let entryLit = false;
  let cleared = 0;

  root.innerHTML = `
    <div class="scene game-scene scene-fade">
      <div class="world-host" id="world-host"></div>
      <div class="hud-top">
        <div class="brand"><span class="brand-dot"></span><strong>PlayHouse</strong><span class="crumb">현관</span></div>
        <div class="phase-badge"><span id="prog">0</span> / ${TOTAL_ROOMS} 방 점등</div>
      </div>
      <div class="hud-hint" id="hud-hint"></div>
      <div class="hud-toast" id="hud-toast"></div>
      <div class="hud-controls">⬆⬇⬅➡ 이동 · Space 상호작용</div>
    </div>
  `;

  const host = root.querySelector('#world-host');
  const hintEl = root.querySelector('#hud-hint');
  const toastEl = root.querySelector('#hud-toast');
  const progEl = root.querySelector('#prog');

  const quest = mountQuest(root.querySelector('.game-scene'), {
    title: '집을 밝혀라',
    subtitle: '깜깜한 PlayHouse에 불을 켜자',
    objectives: [
      { text: '현관 조명 켜기', done: false },
      { text: '다른 방 열기 (곧)', done: false },
    ],
  });

  const doors = [
    { id: 'living',  x: 150, y: 24,  w: 140, h: 34, name: '거실',  locked: true },
    { id: 'kitchen', x: 710, y: 24,  w: 140, h: 34, name: '주방',  locked: true },
    { id: 'bath',    x: 24,  y: 260, w: 34,  h: 120, name: '욕실', locked: true },
    { id: 'bedroom', x: 942, y: 260, w: 34,  h: 120, name: '침실', locked: true },
  ];

  const map = {
    width: MAP_W, height: MAP_H, bg: '#05080f',
    spawn: { x: 486, y: 540 },
    walls: [
      { x: 0, y: 0, w: MAP_W, h: 24 },
      { x: 0, y: MAP_H - 24, w: MAP_W, h: 24 },
      { x: 0, y: 0, w: 24, h: MAP_H },
      { x: MAP_W - 24, y: 0, w: 24, h: MAP_H },
    ],
    triggers: [
      { id: 'entry-switch', ...SWITCH },
      ...doors.map((d) => ({ id: d.id, x: d.x, y: d.y, w: d.w, h: d.h })),
    ],
    draw: (ctx) => drawHouse(ctx, { entryLit, doors }),
  };

  const dark = document.createElement('canvas');
  const dctx = dark.getContext('2d');

  const world = createWorld(host, map, {
    onInteract: handleInteract,
    onFrame: updateHint,
    onDrawOverlay: drawDarkness,
  });

  function handleInteract(id) {
    if (id === 'entry-switch') {
      if (entryLit) { toast('현관은 이미 환해요 ✨'); return; }
      world.pause();
      openRoom(ENTRY_ROOM, { onComplete: completeEntry, onClose: () => world.resume() });
      return;
    }
    const d = doors.find((x) => x.id === id);
    if (d) toast(`🔒 ${d.name} — 곧 열려요!`);
  }

  function completeEntry() {
    entryLit = true;
    cleared = 1;
    progEl.textContent = String(cleared);
    quest.setObjective(0, true);
    quest.setSubtitle(`방 점등 ${cleared} / ${TOTAL_ROOMS}`);
    toast('현관에 불이 들어왔어요! 🎉 (1 / ' + TOTAL_ROOMS + ')');
  }

  function updateHint(state) {
    const tr = state.activeTrigger;
    if (!tr) { hintEl.classList.remove('show'); return; }
    if (tr.id === 'entry-switch') {
      hintEl.innerHTML = entryLit ? 'Space · 현관 조명 (점등됨 ✨)' : '💡 Space · <b>현관 조명 켜기</b>';
    } else {
      const d = doors.find((x) => x.id === tr.id);
      hintEl.innerHTML = `🔒 Space · ${d ? d.name : ''} (곧 열려요)`;
    }
    hintEl.classList.add('show');
  }

  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  // 어둠 오버레이 (EDDIE 손전등 + 점등된 방 빛)
  function drawDarkness(ctx, state, canvas) {
    if (dark.width !== canvas.width || dark.height !== canvas.height) {
      dark.width = canvas.width; dark.height = canvas.height;
    }
    const cam = state.cam, p = state.player;
    dctx.clearRect(0, 0, dark.width, dark.height);
    dctx.fillStyle = 'rgba(3,7,16,0.9)';
    dctx.fillRect(0, 0, dark.width, dark.height);
    dctx.globalCompositeOperation = 'destination-out';
    hole(dctx, p.x + p.w / 2 - cam.x, p.y + p.h / 2 - cam.y, 130);   // 손전등
    if (entryLit) hole(dctx, 500 - cam.x, 330 - cam.y, 430);        // 현관 점등
    dctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(dark, 0, 0);
  }
}

function hole(c, x, y, r) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.65, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

function drawHouse(ctx, { entryLit, doors }) {
  // 바닥 타일
  ctx.fillStyle = '#1c2233';
  ctx.fillRect(0, 0, MAP_W, MAP_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < MAP_W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_H); ctx.stroke(); }
  for (let y = 0; y < MAP_H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_W, y); ctx.stroke(); }

  // 벽
  ctx.fillStyle = '#2b3552';
  ctx.fillRect(0, 0, MAP_W, 24);
  ctx.fillRect(0, MAP_H - 24, MAP_W, 24);
  ctx.fillRect(0, 0, 24, MAP_H);
  ctx.fillRect(MAP_W - 24, 0, 24, MAP_H);

  // 방문 (잠김)
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  for (const d of doors) {
    ctx.fillStyle = '#3a2f1a';
    roundRect(ctx, d.x, d.y, d.w, d.h, 6); ctx.fill();
    ctx.fillStyle = '#caa15a';
    ctx.fillText(`🔒 ${d.name}`, d.x + d.w / 2, d.y + d.h / 2 + 5);
  }

  // 현관 라벨
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '14px sans-serif';
  ctx.fillText('현관 홀', 500, 470);

  // 조명 스위치 / 플로어 램프
  const lx = SWITCH.x + SWITCH.w / 2, ly = SWITCH.y + SWITCH.h / 2;
  if (entryLit) {
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 120);
    g.addColorStop(0, 'rgba(255,225,120,0.55)');
    g.addColorStop(1, 'rgba(255,225,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(lx, ly, 120, 0, Math.PI * 2); ctx.fill();
  }
  // 램프 기둥
  ctx.fillStyle = '#48506a';
  ctx.fillRect(lx - 5, ly - 6, 10, 46);
  ctx.fillStyle = entryLit ? '#ffe14d' : '#39425e';
  roundRect(ctx, lx - 22, ly - 34, 44, 30, 8); ctx.fill();
  ctx.strokeStyle = '#26344f'; ctx.lineWidth = 2;
  roundRect(ctx, lx - 22, ly - 34, 44, 30, 8); ctx.stroke();
  if (!entryLit) {
    ctx.fillStyle = '#9aaccb';
    ctx.font = '11px sans-serif';
    ctx.fillText('스위치', lx, ly + 56);
  }
  ctx.textAlign = 'start';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
