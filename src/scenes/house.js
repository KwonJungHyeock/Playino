// house.js — LED 학습방(집 환경). 방 구역(가구)은 충돌로 막아 캐릭터가 길로만 다니고,
// 가구 앞 바닥의 명패에서 Space 로 입장(불 켜기). 현관 스위치 + 나가기(복도로).

import { createWorld } from '../engine/topdown.js';
import { openRoom } from './room.js';
import { mountQuest } from '../app/quest.js';
import { ROOMS, LOCKED_ROOMS, TOTAL_ROOMS, getRoom } from '../content/rooms.js';

const MAP_W = 1000, MAP_H = 660;

// block: 가구 충돌영역 / door: 앞쪽 상호작용 트리거 / light: 점등 위치
const SPOTS = {
  living:  { block: { x: 62, y: 56, w: 206, h: 120 }, door: { x: 92, y: 182, w: 150, h: 40 }, light: { x: 165, y: 120 } },
  kitchen: { block: { x: 696, y: 56, w: 184, h: 100 }, door: { x: 730, y: 162, w: 150, h: 40 }, light: { x: 800, y: 120 } },
  bath:    { block: { x: 30, y: 268, w: 128, h: 132 }, door: { x: 168, y: 300, w: 60, h: 84 }, light: { x: 95, y: 334 } },
  bedroom: { block: { x: 848, y: 268, w: 130, h: 132 }, door: { x: 760, y: 300, w: 60, h: 84 }, light: { x: 905, y: 334 }, locked: true },
  entry:   { door: { x: 466, y: 470, w: 68, h: 70 }, light: { x: 500, y: 506 }, kind: 'switch' },
};
const EXIT = { x: 468, y: MAP_H - 58, w: 64, h: 38 };
const houseState = { lit: new Set(), cleared: 0 };

export function showHouse(root, { onExit } = {}) {
  root.innerHTML = `
    <div class="scene game-scene scene-fade">
      <div class="world-host" id="world-host"></div>
      <div class="hud-top">
        <div class="brand"><span class="brand-dot"></span><strong>Eduino AI</strong><span class="brand-sep">:</span><b class="brand-sub">LED 학습방</b><span class="crumb">우리 집</span></div>
        <div class="phase-badge"><span id="prog">${houseState.cleared}</span> / ${TOTAL_ROOMS} 점등</div>
      </div>
      <div class="hud-hint" id="hud-hint"></div>
      <div class="hud-toast" id="hud-toast"></div>
      <div class="hud-narrate" id="hud-narrate"></div>
      <div class="hud-controls">⬆⬇⬅➡ 이동 · Space 상호작용</div>
    </div>
  `;
  const hintEl = root.querySelector('#hud-hint');
  const toastEl = root.querySelector('#hud-toast');
  const narrateEl = root.querySelector('#hud-narrate');
  const progEl = root.querySelector('#prog');

  const quest = mountQuest(root.querySelector('.game-scene'), {
    title: 'LED로 집 밝히기',
    subtitle: `점등 ${houseState.cleared} / ${TOTAL_ROOMS}`,
    objectives: [
      ...ROOMS.map((r) => ({ text: `${r.name} (${r.concept})`, done: houseState.lit.has(r.id) })),
      ...LOCKED_ROOMS.map((r) => ({ text: `${r.name} — ${r.note}`, done: false })),
    ],
  });

  const blocks = Object.values(SPOTS).filter((s) => s.block).map((s) => s.block);
  const map = {
    width: MAP_W, height: MAP_H, bg: '#05080f',
    spawn: { x: 486, y: 600 },
    walls: [
      { x: 0, y: 0, w: MAP_W, h: 24 }, { x: 0, y: MAP_H - 24, w: MAP_W, h: 24 },
      { x: 0, y: 0, w: 24, h: MAP_H }, { x: MAP_W - 24, y: 0, w: 24, h: MAP_H },
      ...blocks,
    ],
    triggers: [
      ...ROOMS.map((r) => ({ id: r.id, ...SPOTS[r.id].door })),
      ...LOCKED_ROOMS.map((r) => ({ id: r.id, ...SPOTS[r.id].door })),
      { id: 'exit', ...EXIT },
    ],
    draw: (ctx) => drawHouse(ctx, houseState.lit),
  };

  const dark = document.createElement('canvas');
  const dctx = dark.getContext('2d');

  const world = createWorld(root.querySelector('#world-host'), map, {
    onInteract: handle, onFrame: updateHint, onDrawOverlay: drawDarkness,
  });

  if (houseState.cleared < ROOMS.length) setTimeout(() => narrate('깜깜한 집… 가구 앞으로 가서 Space 로 불을 켜자!'), 400);

  function handle(id) {
    if (id === 'exit') { world.destroy(); onExit?.(); return; }
    if (houseState.lit.has(id)) { toast(`${nameOf(id)}은 이미 환해요 ✨`); return; }
    const content = getRoom(id);
    if (content) { world.pause(); openRoom(content, { onComplete: () => done(id), onClose: () => world.resume() }); return; }
    const locked = LOCKED_ROOMS.find((r) => r.id === id);
    if (locked) toast(`🔒 ${locked.name} — ${locked.note}`);
  }
  function done(id) {
    if (houseState.lit.has(id)) return;
    houseState.lit.add(id); houseState.cleared += 1; progEl.textContent = String(houseState.cleared);
    const idx = ROOMS.findIndex((r) => r.id === id); if (idx >= 0) quest.setObjective(idx, true);
    quest.setSubtitle(`점등 ${houseState.cleared} / ${TOTAL_ROOMS}`);
    if (houseState.cleared >= ROOMS.length) { toast('모든 방에 불이 들어왔어요! 🎉'); setTimeout(() => narrate('EDDIE가 LED로 집을 깨웠다! 복도의 다른 학습방도 곧 열려요.'), 1500); }
    else toast(`${nameOf(id)}에 불이 들어왔어요! 🎉 (${houseState.cleared}/${TOTAL_ROOMS})`);
  }
  const nameOf = (id) => getRoom(id)?.name || LOCKED_ROOMS.find((r) => r.id === id)?.name || id;

  function updateHint(state) {
    const tr = state.activeTrigger;
    if (!tr) { hintEl.classList.remove('show'); return; }
    if (tr.id === 'exit') hintEl.innerHTML = '🚪 Space · 복도로 나가기';
    else if (houseState.lit.has(tr.id)) hintEl.innerHTML = `${nameOf(tr.id)} · 점등됨 ✨`;
    else if (getRoom(tr.id)) hintEl.innerHTML = `💡 Space · <b>${nameOf(tr.id)}</b> 불 켜기`;
    else hintEl.innerHTML = `🔒 Space · ${nameOf(tr.id)} (곧)`;
    hintEl.classList.add('show');
  }
  let tT = null, nT = null;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => toastEl.classList.remove('show'), 2400); }
  function narrate(t) { narrateEl.innerHTML = `<span>🤖 ${t}</span>`; narrateEl.classList.add('show'); clearTimeout(nT); nT = setTimeout(() => narrateEl.classList.remove('show'), 4200); }

  function drawDarkness(ctx, state, canvas) {
    if (dark.width !== canvas.width || dark.height !== canvas.height) { dark.width = canvas.width; dark.height = canvas.height; }
    const cam = state.cam, p = state.player;
    dctx.clearRect(0, 0, dark.width, dark.height);
    dctx.fillStyle = 'rgba(3,7,16,0.88)'; dctx.fillRect(0, 0, dark.width, dark.height);
    dctx.globalCompositeOperation = 'destination-out';
    hole(dctx, p.x + p.w / 2 - cam.x, p.y + p.h / 2 - cam.y, 150);
    for (const id of houseState.lit) { const s = SPOTS[id]; hole(dctx, s.light.x - cam.x, s.light.y - cam.y, id === 'entry' ? 320 : 220); }
    dctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(dark, 0, 0);
  }
}

function hole(c, x, y, r) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.65, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}

// ===== 인테리어 =====
function drawHouse(ctx, lit) {
  // 원목 바닥 + 결
  ctx.fillStyle = '#6e5132'; ctx.fillRect(0, 0, MAP_W, MAP_H);
  const fg = ctx.createLinearGradient(0, 0, 0, MAP_H); fg.addColorStop(0, 'rgba(255,222,160,0.12)'); fg.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = fg; ctx.fillRect(0, 0, MAP_W, MAP_H);
  ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 2;
  for (let y = 38; y < MAP_H; y += 38) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_W, y); ctx.stroke(); }
  // 중앙 러그
  ctx.fillStyle = '#2f3e6b'; rr(ctx, 372, 392, 256, 150, 16); ctx.fill();
  ctx.strokeStyle = '#46599a'; ctx.lineWidth = 4; rr(ctx, 384, 404, 232, 126, 12); ctx.stroke();
  // 벽 + 걸레받이
  ctx.fillStyle = '#222a40'; ctx.fillRect(0, 0, MAP_W, 24); ctx.fillRect(0, MAP_H - 24, MAP_W, 24); ctx.fillRect(0, 0, 24, MAP_H); ctx.fillRect(MAP_W - 24, 0, 24, MAP_H);
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(24, 24, MAP_W - 48, 5);

  // 가구
  shadow(ctx, SPOTS.living.block); livingRoom(ctx, lit.has('living'));
  shadow(ctx, SPOTS.kitchen.block); kitchen(ctx, lit.has('kitchen'));
  shadow(ctx, SPOTS.bath.block); bathroom(ctx, lit.has('bath'));
  shadow(ctx, SPOTS.bedroom.block); bedroom(ctx, lit.has('bedroom'));
  entryway(ctx, lit.has('entry'));

  // 나가기
  ctx.fillStyle = '#5a3a2a'; rr(ctx, EXIT.x - 6, MAP_H - 28, EXIT.w + 12, 24, 5); ctx.fill();
  ctx.fillStyle = '#caa15a'; rr(ctx, EXIT.x, MAP_H - 24, EXIT.w, 18, 4); ctx.fill();
  ctx.fillStyle = '#cfe0ff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🚪 복도로', EXIT.x + EXIT.w / 2, MAP_H - 36);

  // 바닥 명패 (가구 앞)
  for (const [id, s] of Object.entries(SPOTS)) {
    if (s.kind === 'switch') continue;
    const d = s.door, isLit = lit.has(id), locked = s.locked, name = getRoom(id)?.name || LOCKED_ROOMS.find((r) => r.id === id)?.name || id;
    ctx.fillStyle = locked ? 'rgba(40,32,52,0.85)' : (isLit ? 'rgba(120,90,30,0.85)' : 'rgba(40,55,100,0.85)');
    rr(ctx, d.x, d.y + d.h - 22, d.w, 20, 6); ctx.fill();
    ctx.fillStyle = locked ? '#8d7ba0' : (isLit ? '#ffe9b0' : '#dce8ff'); ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(locked ? `🔒 ${name}` : `${name}${isLit ? ' ✨' : ' ▸'}`, d.x + d.w / 2, d.y + d.h - 8);
  }
  ctx.textAlign = 'start';
}

function shadow(ctx, b) { if (!b) return; ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(b.x + b.w / 2, b.y + b.h - 2, b.w / 2, 12, 0, 0, 6.283); ctx.fill(); }
function livingRoom(ctx, l) {
  ctx.fillStyle = '#4f6aa8'; rr(ctx, 70, 70, 150, 58, 12); ctx.fill();
  ctx.fillStyle = '#5d7bc0'; rr(ctx, 78, 64, 134, 26, 10); ctx.fill();
  ctx.fillStyle = '#3a528a'; rr(ctx, 70, 110, 150, 18, 8); ctx.fill();
  ctx.fillStyle = '#7a5230'; rr(ctx, 110, 140, 78, 28, 6); ctx.fill();
  ctx.fillStyle = '#0c1018'; rr(ctx, 150, 28, 110, 20, 4); ctx.fill();
  ctx.fillStyle = l ? '#7fd6ff' : '#26405a'; rr(ctx, 154, 30, 102, 14, 2); ctx.fill();
  ctx.fillStyle = '#2a6e3f'; ctx.beginPath(); ctx.arc(248, 120, 16, 0, 6.283); ctx.fill(); ctx.fillStyle = '#7a5230'; ctx.fillRect(240, 130, 16, 16);
}
function kitchen(ctx, l) {
  ctx.fillStyle = '#6b7390'; ctx.fillRect(700, 28, 176, 22);
  ctx.fillStyle = '#9aa3bd'; rr(ctx, 700, 70, 176, 40, 6); ctx.fill(); ctx.fillStyle = '#7c849e'; ctx.fillRect(700, 104, 176, 8);
  ctx.fillStyle = '#2a3146'; rr(ctx, 720, 78, 50, 26, 4); ctx.fill();
  ctx.fillStyle = l ? '#ff7a4a' : '#444'; ctx.beginPath(); ctx.arc(733, 91, 5, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.arc(757, 91, 5, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#cdd4e6'; rr(ctx, 832, 66, 40, 86, 6); ctx.fill(); ctx.fillStyle = '#9aa3bd'; ctx.fillRect(836, 96, 32, 4);
}
function bathroom(ctx, l) {
  ctx.fillStyle = '#dfe8f2'; rr(ctx, 40, 270, 110, 64, 18); ctx.fill();
  ctx.fillStyle = l ? '#bfe6ff' : '#8aa6c4'; rr(ctx, 50, 280, 90, 44, 14); ctx.fill();
  ctx.fillStyle = '#cdd4e6'; rr(ctx, 44, 352, 56, 34, 8); ctx.fill(); ctx.fillStyle = '#9aa3bd'; ctx.beginPath(); ctx.arc(72, 369, 12, 0, 6.283); ctx.fill();
  ctx.fillStyle = l ? '#cfeefe' : '#3a4a60'; rr(ctx, 50, 320, 40, 26, 4); ctx.fill();
}
function bedroom(ctx, l) {
  ctx.fillStyle = '#6b4e74'; rr(ctx, 858, 268, 110, 92, 12); ctx.fill();
  ctx.fillStyle = '#cdd4e6'; rr(ctx, 866, 276, 94, 34, 8); ctx.fill();
  ctx.fillStyle = '#8a6fb0'; rr(ctx, 866, 312, 94, 42, 8); ctx.fill();
  ctx.fillStyle = '#7a5230'; rr(ctx, 858, 372, 34, 26, 4); ctx.fill();
  ctx.fillStyle = l ? '#ffe14d' : '#5a5a40'; ctx.beginPath(); ctx.arc(875, 368, 8, 0, 6.283); ctx.fill();
}
function entryway(ctx, l) {
  const lx = SPOTS.entry.light.x, ly = SPOTS.entry.light.y;
  if (l) { const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 130); g.addColorStop(0, 'rgba(255,228,130,0.5)'); g.addColorStop(1, 'rgba(255,228,130,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, 130, 0, 6.283); ctx.fill(); }
  ctx.fillStyle = '#48506a'; ctx.fillRect(lx - 5, ly - 4, 10, 40);
  ctx.fillStyle = l ? '#ffe14d' : '#39425e'; rr(ctx, lx - 22, ly - 30, 44, 28, 8); ctx.fill();
  ctx.strokeStyle = '#26344f'; ctx.lineWidth = 2; rr(ctx, lx - 22, ly - 30, 44, 28, 8); ctx.stroke();
  ctx.fillStyle = '#cdb98a'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(l ? '현관 ✨' : '현관 스위치 ▸', lx, ly + 52);
  ctx.fillStyle = '#3a2f1a'; rr(ctx, 448, 560, 104, 28, 6); ctx.fill(); ctx.fillStyle = '#5a4a2a'; rr(ctx, 456, 566, 88, 16, 4); ctx.fill();
  ctx.textAlign = 'start';
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
