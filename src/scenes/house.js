// house.js — 집 내부 씬. 깜깜한 집을 방마다 돌며 불을 켠다.
// 현관(중앙 스위치) + 거실/주방/욕실(벽 문) + 침실(잠금).
// 방 완료 시 그 구역이 환해지고 진척이 오른다.

import { createWorld } from '../engine/topdown.js';
import { openRoom } from './room.js';
import { mountQuest } from '../app/quest.js';
import { ROOMS, LOCKED_ROOMS, TOTAL_ROOMS, getRoom } from '../content/rooms.js';

const MAP_W = 1000;
const MAP_H = 640;

// 방별 맵 배치 (문/조명 위치)
const SPOTS = {
  entry:   { door: { x: 466, y: 300, w: 64, h: 72 }, light: { x: 498, y: 334 }, kind: 'switch' },
  living:  { door: { x: 150, y: 24,  w: 150, h: 34 }, light: { x: 224, y: 70 } },
  kitchen: { door: { x: 700, y: 24,  w: 150, h: 34 }, light: { x: 774, y: 70 } },
  bath:    { door: { x: 24,  y: 250, w: 34,  h: 130 }, light: { x: 66, y: 315 } },
  bedroom: { door: { x: 942, y: 250, w: 34,  h: 130 }, light: { x: 934, y: 315 }, locked: true },
};

export function showHouse(root) {
  const lit = new Set();
  let cleared = 0;

  root.innerHTML = `
    <div class="scene game-scene scene-fade">
      <div class="world-host" id="world-host"></div>
      <div class="hud-top">
        <div class="brand"><span class="brand-dot"></span><strong>PlayHouse</strong><span class="crumb">집 안</span></div>
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
    subtitle: `방 점등 0 / ${TOTAL_ROOMS}`,
    objectives: [
      ...ROOMS.map((r) => ({ text: `${r.name} 불 켜기 (${r.concept})`, done: false })),
      ...LOCKED_ROOMS.map((r) => ({ text: `${r.name} — ${r.note}`, done: false })),
    ],
  });

  const triggers = [
    ...ROOMS.map((r) => ({ id: r.id, ...SPOTS[r.id].door })),
    ...LOCKED_ROOMS.map((r) => ({ id: r.id, ...SPOTS[r.id].door })),
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
    triggers,
    draw: (ctx) => drawHouse(ctx, lit),
  };

  const dark = document.createElement('canvas');
  const dctx = dark.getContext('2d');

  const world = createWorld(host, map, {
    onInteract: handleInteract,
    onFrame: updateHint,
    onDrawOverlay: drawDarkness,
  });

  // 입장 스토리
  setTimeout(() => narrate('드디어 PlayHouse 안으로! 집이 깜깜하다… 손전등에 의지해 현관 스위치부터 찾자.'), 400);

  function handleInteract(id) {
    if (lit.has(id)) { toast(`${nameOf(id)}은 이미 환해요 ✨`); return; }
    const content = getRoom(id);
    if (content) {
      world.pause();
      openRoom(content, {
        onComplete: () => completeRoom(id),
        onClose: () => world.resume(),
      });
      return;
    }
    const locked = LOCKED_ROOMS.find((r) => r.id === id);
    if (locked) toast(`🔒 ${locked.name} — ${locked.note}`);
  }

  function completeRoom(id) {
    if (lit.has(id)) return;
    lit.add(id);
    cleared += 1;
    progEl.textContent = String(cleared);
    const idx = ROOMS.findIndex((r) => r.id === id);
    if (idx >= 0) quest.setObjective(idx, true);
    quest.setSubtitle(`방 점등 ${cleared} / ${TOTAL_ROOMS}`);
    if (cleared >= ROOMS.length) {
      toast('모든 방에 불이 들어왔어요! 🎉 EDDIE가 PlayHouse를 깨웠다!');
      setTimeout(() => narrate('남은 곳은 침실(온도 센서) — 곧 새 모험이 열려요!'), 1800);
    } else {
      toast(`${nameOf(id)}에 불이 들어왔어요! 🎉 (${cleared} / ${TOTAL_ROOMS})`);
    }
  }

  function nameOf(id) {
    return getRoom(id)?.name || LOCKED_ROOMS.find((r) => r.id === id)?.name || id;
  }

  function updateHint(state) {
    const tr = state.activeTrigger;
    if (!tr) { hintEl.classList.remove('show'); return; }
    if (lit.has(tr.id)) hintEl.innerHTML = `${nameOf(tr.id)} · 점등됨 ✨`;
    else if (getRoom(tr.id)) hintEl.innerHTML = `💡 Space · <b>${nameOf(tr.id)}</b> 들어가기`;
    else hintEl.innerHTML = `🔒 Space · ${nameOf(tr.id)} (곧 열려요)`;
    hintEl.classList.add('show');
  }

  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  let narrateEl = null;
  function narrate(text) {
    if (!narrateEl) {
      narrateEl = document.createElement('div');
      narrateEl.className = 'hud-narrate';
      root.querySelector('.game-scene').appendChild(narrateEl);
    }
    narrateEl.innerHTML = `<span>🤖 ${text}</span>`;
    narrateEl.classList.add('show');
    setTimeout(() => narrateEl && narrateEl.classList.remove('show'), 4200);
  }

  function drawDarkness(ctx, state, canvas) {
    if (dark.width !== canvas.width || dark.height !== canvas.height) { dark.width = canvas.width; dark.height = canvas.height; }
    const cam = state.cam, p = state.player;
    dctx.clearRect(0, 0, dark.width, dark.height);
    dctx.fillStyle = 'rgba(3,7,16,0.9)';
    dctx.fillRect(0, 0, dark.width, dark.height);
    dctx.globalCompositeOperation = 'destination-out';
    hole(dctx, p.x + p.w / 2 - cam.x, p.y + p.h / 2 - cam.y, 130);
    for (const id of lit) {
      const s = SPOTS[id];
      const r = id === 'entry' ? 360 : 200;
      hole(dctx, s.light.x - cam.x, s.light.y - cam.y, r);
    }
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
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}

function drawHouse(ctx, lit) {
  // 바닥
  ctx.fillStyle = '#1c2233';
  ctx.fillRect(0, 0, MAP_W, MAP_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < MAP_W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_H); ctx.stroke(); }
  for (let y = 0; y < MAP_H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_W, y); ctx.stroke(); }

  // 벽
  ctx.fillStyle = '#2b3552';
  ctx.fillRect(0, 0, MAP_W, 24); ctx.fillRect(0, MAP_H - 24, MAP_W, 24);
  ctx.fillRect(0, 0, 24, MAP_H); ctx.fillRect(MAP_W - 24, 0, 24, MAP_H);

  // 방 문 / 스위치
  ctx.textAlign = 'center';
  for (const [id, s] of Object.entries(SPOTS)) {
    const isLit = lit.has(id);
    const locked = s.locked;
    const name = getRoom(id)?.name || LOCKED_ROOMS.find((r) => r.id === id)?.name || id;

    if (s.kind === 'switch') {
      // 중앙 플로어 램프 (현관)
      const lx = s.light.x, ly = s.light.y;
      if (isLit) {
        const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 120);
        g.addColorStop(0, 'rgba(255,225,120,0.55)'); g.addColorStop(1, 'rgba(255,225,120,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, 120, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#48506a'; ctx.fillRect(lx - 5, ly - 6, 10, 46);
      ctx.fillStyle = isLit ? '#ffe14d' : '#39425e';
      rr(ctx, lx - 22, ly - 34, 44, 30, 8); ctx.fill();
      ctx.strokeStyle = '#26344f'; ctx.lineWidth = 2; rr(ctx, lx - 22, ly - 34, 44, 30, 8); ctx.stroke();
      ctx.fillStyle = '#9aaccb'; ctx.font = '12px sans-serif';
      ctx.fillText(isLit ? '현관 ✨' : '현관 스위치', lx, ly + 54);
      continue;
    }

    // 벽 문
    const d = s.door;
    if (isLit) {
      const g = ctx.createRadialGradient(s.light.x, s.light.y, 0, s.light.x, s.light.y, 110);
      g.addColorStop(0, 'rgba(255,225,120,0.5)'); g.addColorStop(1, 'rgba(255,225,120,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.light.x, s.light.y, 110, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = isLit ? '#6b5a2a' : (locked ? '#2a2333' : '#3a3f5a');
    rr(ctx, d.x, d.y, d.w, d.h, 6); ctx.fill();
    if (!locked && !isLit) { ctx.strokeStyle = '#6f86c4'; ctx.lineWidth = 2; rr(ctx, d.x, d.y, d.w, d.h, 6); ctx.stroke(); }
    ctx.fillStyle = locked ? '#7d6f8f' : (isLit ? '#ffe9b0' : '#cfe0ff');
    ctx.font = 'bold 15px sans-serif';
    const label = locked ? `🔒 ${name}` : (isLit ? `${name} ✨` : `${name} ▸`);
    const cx = d.x + d.w / 2, cy = d.y + d.h / 2 + 5;
    ctx.fillText(label, cx, cy);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '13px sans-serif';
  ctx.fillText('현관 홀', 500, 470);
  ctx.textAlign = 'start';
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
