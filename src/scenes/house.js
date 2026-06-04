// house.js — 집 내부(원룸형). 방별 구역에 가구가 배치되고, 문 앞에서 불을 켠다.
// 현관(중앙 스위치)·거실·주방·욕실 + 침실(잠금) + 나가기(밖으로).
// 진행 상태는 모듈 레벨로 유지되어 밖에 나갔다 와도 보존된다.

import { createWorld } from '../engine/topdown.js';
import { openRoom } from './room.js';
import { mountQuest } from '../app/quest.js';
import { ROOMS, LOCKED_ROOMS, TOTAL_ROOMS, getRoom } from '../content/rooms.js';

const MAP_W = 1000, MAP_H = 640;

const SPOTS = {
  entry:   { door: { x: 466, y: 286, w: 68, h: 70 }, light: { x: 500, y: 320 }, kind: 'switch' },
  living:  { door: { x: 120, y: 24, w: 170, h: 36 }, light: { x: 175, y: 110 } },
  kitchen: { door: { x: 710, y: 24, w: 170, h: 36 }, light: { x: 820, y: 110 } },
  bath:    { door: { x: 24, y: 250, w: 36, h: 140 }, light: { x: 95, y: 330 } },
  bedroom: { door: { x: 940, y: 250, w: 36, h: 140 }, light: { x: 905, y: 330 }, locked: true },
};
const EXIT = { x: 468, y: MAP_H - 60, w: 64, h: 38 };

// 진행 상태 유지 (씬 재생성에도 보존)
const houseState = { lit: new Set(), cleared: 0 };

export function showHouse(root, { onExit } = {}) {
  root.innerHTML = `
    <div class="scene game-scene scene-fade">
      <div class="world-host" id="world-host"></div>
      <div class="hud-top">
        <div class="brand"><span class="brand-dot"></span><strong>Eduino AI</strong><span class="brand-sep">:</span><b class="brand-sub">PlayHouse</b><span class="crumb">집 안</span></div>
        <div class="phase-badge"><span id="prog">${houseState.cleared}</span> / ${TOTAL_ROOMS} 방 점등</div>
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
    title: '집을 밝혀라',
    subtitle: `방 점등 ${houseState.cleared} / ${TOTAL_ROOMS}`,
    objectives: [
      ...ROOMS.map((r) => ({ text: `${r.name} (${r.concept})`, done: houseState.lit.has(r.id) })),
      ...LOCKED_ROOMS.map((r) => ({ text: `${r.name} — ${r.note}`, done: false })),
    ],
  });

  const triggers = [
    ...ROOMS.map((r) => ({ id: r.id, ...SPOTS[r.id].door })),
    ...LOCKED_ROOMS.map((r) => ({ id: r.id, ...SPOTS[r.id].door })),
    { id: 'exit', ...EXIT },
  ];

  const map = {
    width: MAP_W, height: MAP_H, bg: '#05080f',
    spawn: { x: 486, y: 470 },
    walls: [
      { x: 0, y: 0, w: MAP_W, h: 24 }, { x: 0, y: MAP_H - 24, w: MAP_W, h: 24 },
      { x: 0, y: 0, w: 24, h: MAP_H }, { x: MAP_W - 24, y: 0, w: 24, h: MAP_H },
    ],
    triggers,
    draw: (ctx) => drawHouse(ctx, houseState.lit),
  };

  const dark = document.createElement('canvas');
  const dctx = dark.getContext('2d');

  const world = createWorld(root.querySelector('#world-host'), map, {
    onInteract: handleInteract,
    onFrame: updateHint,
    onDrawOverlay: drawDarkness,
  });

  if (houseState.cleared < ROOMS.length) {
    setTimeout(() => narrate('깜깜한 집… 손전등에 의지해 방마다 불을 켜자. 문 앞에서 Space!'), 400);
  }

  function handleInteract(id) {
    if (id === 'exit') { world.destroy(); onExit?.(); return; }
    if (houseState.lit.has(id)) { toast(`${nameOf(id)}은 이미 환해요 ✨`); return; }
    const content = getRoom(id);
    if (content) { world.pause(); openRoom(content, { onComplete: () => completeRoom(id), onClose: () => world.resume() }); return; }
    const locked = LOCKED_ROOMS.find((r) => r.id === id);
    if (locked) toast(`🔒 ${locked.name} — ${locked.note}`);
  }

  function completeRoom(id) {
    if (houseState.lit.has(id)) return;
    houseState.lit.add(id);
    houseState.cleared += 1;
    progEl.textContent = String(houseState.cleared);
    const idx = ROOMS.findIndex((r) => r.id === id);
    if (idx >= 0) quest.setObjective(idx, true);
    quest.setSubtitle(`방 점등 ${houseState.cleared} / ${TOTAL_ROOMS}`);
    if (houseState.cleared >= ROOMS.length) {
      toast('모든 방에 불이 들어왔어요! 🎉');
      setTimeout(() => narrate('EDDIE가 PlayHouse를 깨웠다! 남은 곳은 침실(온도센서) — 곧 새 모험이!'), 1600);
    } else toast(`${nameOf(id)}에 불이 들어왔어요! 🎉 (${houseState.cleared} / ${TOTAL_ROOMS})`);
  }

  const nameOf = (id) => getRoom(id)?.name || LOCKED_ROOMS.find((r) => r.id === id)?.name || id;

  function updateHint(state) {
    const tr = state.activeTrigger;
    if (!tr) { hintEl.classList.remove('show'); return; }
    if (tr.id === 'exit') hintEl.innerHTML = '🚪 Space · 밖으로 나가기';
    else if (houseState.lit.has(tr.id)) hintEl.innerHTML = `${nameOf(tr.id)} · 점등됨 ✨`;
    else if (getRoom(tr.id)) hintEl.innerHTML = `💡 Space · <b>${nameOf(tr.id)}</b> 불 켜기`;
    else hintEl.innerHTML = `🔒 Space · ${nameOf(tr.id)} (곧 열려요)`;
    hintEl.classList.add('show');
  }

  let tT = null;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => toastEl.classList.remove('show'), 2400); }
  let nT = null;
  function narrate(text) { narrateEl.innerHTML = `<span>🤖 ${text}</span>`; narrateEl.classList.add('show'); clearTimeout(nT); nT = setTimeout(() => narrateEl.classList.remove('show'), 4200); }

  function drawDarkness(ctx, state, canvas) {
    if (dark.width !== canvas.width || dark.height !== canvas.height) { dark.width = canvas.width; dark.height = canvas.height; }
    const cam = state.cam, p = state.player;
    dctx.clearRect(0, 0, dark.width, dark.height);
    dctx.fillStyle = 'rgba(3,7,16,0.88)';
    dctx.fillRect(0, 0, dark.width, dark.height);
    dctx.globalCompositeOperation = 'destination-out';
    hole(dctx, p.x + p.w / 2 - cam.x, p.y + p.h / 2 - cam.y, 150);
    for (const id of houseState.lit) { const s = SPOTS[id]; hole(dctx, s.light.x - cam.x, s.light.y - cam.y, id === 'entry' ? 340 : 230); }
    dctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(dark, 0, 0);
  }
}

function hole(c, x, y, r) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.65, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}

// ===== 인테리어 렌더 =====
function drawHouse(ctx, lit) {
  // 바닥(원목)
  ctx.fillStyle = '#6b4e2e'; ctx.fillRect(0, 0, MAP_W, MAP_H);
  const fg = ctx.createLinearGradient(0, 0, 0, MAP_H);
  fg.addColorStop(0, 'rgba(255,220,160,0.10)'); fg.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = fg; ctx.fillRect(0, 0, MAP_W, MAP_H);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2;
  for (let y = 40; y < MAP_H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_W, y); ctx.stroke(); }
  for (let x = 0; x < MAP_W; x += 120) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_H); ctx.stroke(); }

  // 중앙 러그
  ctx.fillStyle = '#2f3e6b'; rr(ctx, 360, 360, 280, 170, 16); ctx.fill();
  ctx.strokeStyle = '#46599a'; ctx.lineWidth = 4; rr(ctx, 372, 372, 256, 146, 12); ctx.stroke();

  // 벽 + 걸레받이
  ctx.fillStyle = '#222a40'; ctx.fillRect(0, 0, MAP_W, 24); ctx.fillRect(0, MAP_H - 24, MAP_W, 24); ctx.fillRect(0, 0, 24, MAP_H); ctx.fillRect(MAP_W - 24, 0, 24, MAP_H);
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(24, 24, MAP_W - 48, 6); ctx.fillRect(24, MAP_H - 30, MAP_W - 48, 6);

  // 가구
  livingRoom(ctx, lit.has('living'));
  kitchen(ctx, lit.has('kitchen'));
  bathroom(ctx, lit.has('bath'));
  bedroom(ctx, lit.has('bedroom'));
  entryway(ctx, lit.has('entry'));

  // 나가기 문 (하단)
  ctx.fillStyle = '#5a3a2a'; rr(ctx, EXIT.x - 6, MAP_H - 30, EXIT.w + 12, 26, 5); ctx.fill();
  ctx.fillStyle = '#caa15a'; rr(ctx, EXIT.x, MAP_H - 26, EXIT.w, 20, 4); ctx.fill();
  ctx.fillStyle = '#cfe0ff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('🚪 나가기', EXIT.x + EXIT.w / 2, MAP_H - 40);

  // 방 이름표 (문 위)
  ctx.font = 'bold 15px sans-serif';
  for (const [id, s] of Object.entries(SPOTS)) {
    if (s.kind === 'switch') continue;
    const isLit = lit.has(id), locked = s.locked, d = s.door;
    if (isLit) { const g = ctx.createRadialGradient(s.light.x, s.light.y, 0, s.light.x, s.light.y, 150); g.addColorStop(0, 'rgba(255,228,130,0.34)'); g.addColorStop(1, 'rgba(255,228,130,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.light.x, s.light.y, 150, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = locked ? '#2a2333' : '#33406b'; rr(ctx, d.x, d.y, d.w, d.h, 6); ctx.fill();
    ctx.fillStyle = locked ? '#8d7ba0' : (isLit ? '#ffe9b0' : '#dce8ff');
    const label = locked ? `🔒 ${getRoom(id)?.name || '침실'}` : `${getRoom(id)?.name || id}${isLit ? ' ✨' : ' ▸'}`;
    const horiz = d.w > d.h;
    if (horiz) ctx.fillText(label, d.x + d.w / 2, d.y + d.h / 2 + 5);
    else { ctx.save(); ctx.translate(d.x + d.w / 2 + (d.x < 100 ? 30 : -30), d.y + d.h / 2); ctx.fillText(label, 0, 5); ctx.restore(); }
  }
  ctx.textAlign = 'start';
}

// --- 가구 ---
function tone(ctx, lit) { ctx.globalAlpha = lit ? 1 : 0.92; }
function livingRoom(ctx, lit) {
  tone(ctx, lit);
  // 소파
  ctx.fillStyle = '#4f6aa8'; rr(ctx, 70, 70, 150, 58, 12); ctx.fill();
  ctx.fillStyle = '#5d7bc0'; rr(ctx, 78, 64, 134, 26, 10); ctx.fill();
  ctx.fillStyle = '#3a528a'; rr(ctx, 70, 110, 150, 18, 8); ctx.fill();
  // 협탁/커피테이블
  ctx.fillStyle = '#7a5230'; rr(ctx, 110, 140, 78, 30, 6); ctx.fill();
  // TV (상단 벽)
  ctx.fillStyle = '#0c1018'; rr(ctx, 150, 28, 110, 20, 4); ctx.fill();
  ctx.fillStyle = lit ? '#7fd6ff' : '#26405a'; rr(ctx, 154, 30, 102, 14, 2); ctx.fill();
  // 화분
  ctx.fillStyle = '#2a6e3f'; ctx.beginPath(); ctx.arc(248, 120, 16, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#7a5230'; ctx.fillRect(240, 130, 16, 16);
  ctx.globalAlpha = 1;
}
function kitchen(ctx, lit) {
  tone(ctx, lit);
  // 상단 수납장
  ctx.fillStyle = '#6b7390'; ctx.fillRect(700, 28, 176, 22);
  // 조리대
  ctx.fillStyle = '#9aa3bd'; rr(ctx, 700, 70, 176, 40, 6); ctx.fill();
  ctx.fillStyle = '#7c849e'; ctx.fillRect(700, 104, 176, 8);
  // 가스레인지
  ctx.fillStyle = '#2a3146'; rr(ctx, 720, 78, 50, 26, 4); ctx.fill();
  ctx.fillStyle = lit ? '#ff7a4a' : '#444'; ctx.beginPath(); ctx.arc(733, 91, 5, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.arc(757, 91, 5, 0, 6.283); ctx.fill();
  // 냉장고
  ctx.fillStyle = '#cdd4e6'; rr(ctx, 832, 66, 40, 86, 6); ctx.fill();
  ctx.fillStyle = '#9aa3bd'; ctx.fillRect(836, 96, 32, 4);
  ctx.globalAlpha = 1;
}
function bathroom(ctx, lit) {
  tone(ctx, lit);
  // 욕조
  ctx.fillStyle = '#dfe8f2'; rr(ctx, 40, 270, 110, 64, 18); ctx.fill();
  ctx.fillStyle = lit ? '#bfe6ff' : '#8aa6c4'; rr(ctx, 50, 280, 90, 44, 14); ctx.fill();
  // 세면대
  ctx.fillStyle = '#cdd4e6'; rr(ctx, 44, 352, 56, 34, 8); ctx.fill();
  ctx.fillStyle = '#9aa3bd'; ctx.beginPath(); ctx.arc(72, 369, 12, 0, 6.283); ctx.fill();
  // 거울
  ctx.fillStyle = lit ? '#cfeefe' : '#3a4a60'; rr(ctx, 50, 320, 40, 26, 4); ctx.fill();
  ctx.globalAlpha = 1;
}
function bedroom(ctx, lit) {
  tone(ctx, lit);
  // 침대
  ctx.fillStyle = '#6b4e74'; rr(ctx, 858, 268, 110, 92, 12); ctx.fill();   // 프레임
  ctx.fillStyle = '#cdd4e6'; rr(ctx, 866, 276, 94, 34, 8); ctx.fill();      // 베개
  ctx.fillStyle = '#8a6fb0'; rr(ctx, 866, 312, 94, 42, 8); ctx.fill();      // 이불
  // 협탁 + 램프
  ctx.fillStyle = '#7a5230'; rr(ctx, 858, 372, 34, 26, 4); ctx.fill();
  ctx.fillStyle = lit ? '#ffe14d' : '#5a5a40'; ctx.beginPath(); ctx.arc(875, 368, 8, 0, 6.283); ctx.fill();
  ctx.globalAlpha = 1;
}
function entryway(ctx, lit) {
  const lx = SPOTS.entry.light.x, ly = SPOTS.entry.light.y;
  if (lit) { const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 130); g.addColorStop(0, 'rgba(255,228,130,0.5)'); g.addColorStop(1, 'rgba(255,228,130,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, 130, 0, 6.283); ctx.fill(); }
  // 플로어 램프(스위치)
  ctx.fillStyle = '#48506a'; ctx.fillRect(lx - 5, ly - 4, 10, 44);
  ctx.fillStyle = lit ? '#ffe14d' : '#39425e'; rr(ctx, lx - 22, ly - 32, 44, 30, 8); ctx.fill();
  ctx.strokeStyle = '#26344f'; ctx.lineWidth = 2; rr(ctx, lx - 22, ly - 32, 44, 30, 8); ctx.stroke();
  ctx.fillStyle = '#cdb98a'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(lit ? '현관 ✨' : '현관 스위치', lx, ly + 56);
  // 현관 매트
  ctx.fillStyle = '#3a2f1a'; rr(ctx, 448, 560, 104, 30, 6); ctx.fill();
  ctx.fillStyle = '#5a4a2a'; rr(ctx, 456, 566, 88, 18, 4); ctx.fill();
  ctx.textAlign = 'start';
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
