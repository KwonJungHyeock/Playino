// lab.js — 연구소 복도 (오버월드). 양쪽 문마다 구성품(센서). LED만 개방.
// LED 문 상호작용 → 결선 안내 창 → 완료 시 LED 학습방(집)으로.

import { createWorld } from '../engine/topdown.js';
import { mountQuest } from '../app/quest.js';
import { openWiring } from './wiring.js';
import { LED_WIRING } from '../content/wiring.js';
import { SENSORS } from '../content/sensors.js';

const MAP_H = 560;
const DOOR_W = 120, GAP = 210, START = 80;
const TOP_Y = 200, BOT_Y = 316;   // 복도 안 트리거 y (벽 앞)

export function showLab(root, { onEnterLed } = {}) {
  // 문 배치: 앞쪽 절반은 위, 나머지는 아래
  const topN = Math.ceil(SENSORS.length / 2);
  const doors = SENSORS.map((s, i) => {
    const top = i < topN;
    const k = top ? i : i - topN;
    return { ...s, top, x: START + k * GAP, y: top ? TOP_Y : BOT_Y };
  });
  const MAP_W = START + Math.max(topN, SENSORS.length - topN) * GAP + 80;

  root.innerHTML = `
    <div class="scene game-scene scene-fade">
      <div class="world-host" id="world-host"></div>
      <div class="hud-top">
        <div class="brand"><span class="brand-dot"></span><strong>Eduino AI</strong><span class="brand-sep">:</span><b class="brand-sub">스타터 키트</b><span class="crumb">연구소 복도</span></div>
        <div class="phase-badge">학습방 선택</div>
      </div>
      <div class="hud-hint" id="hud-hint"></div>
      <div class="hud-toast" id="hud-toast"></div>
      <div class="hud-controls">⬅➡ 이동 · Space 입장</div>
    </div>
  `;
  const hintEl = root.querySelector('#hud-hint');
  const toastEl = root.querySelector('#hud-toast');

  mountQuest(root.querySelector('.game-scene'), {
    title: '학습방 찾기',
    subtitle: '연구소 복도에서 오늘의 방으로!',
    objectives: [{ text: '💡 LED 학습방에 입장하기', done: false }, { text: '나머지 구성품 — 곧 열림 🔒', done: false }],
  });

  const map = {
    width: MAP_W, height: MAP_H, bg: '#0a1020',
    spawn: { x: 120, y: 268 },
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
  });

  function handle(id) {
    if (id === 'led') {
      world.pause();
      openWiring(LED_WIRING, {
        onDone: () => { world.destroy(); onEnterLed?.(); },
        onClose: () => world.resume(),
      });
    } else {
      const s = SENSORS.find((x) => x.id === id);
      toast(`🔒 ${s ? s.icon + ' ' + s.name : ''} 학습방 — 곧 열려요!`);
    }
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
  // 복도 바닥
  ctx.fillStyle = '#141d33'; ctx.fillRect(0, 0, MAP_W, MAP_H);
  const g = ctx.createLinearGradient(0, 188, 0, 372);
  g.addColorStop(0, '#1b2746'); g.addColorStop(0.5, '#22305a'); g.addColorStop(1, '#1b2746');
  ctx.fillStyle = g; ctx.fillRect(0, 188, MAP_W, 184);
  // 바닥 타일선
  ctx.strokeStyle = 'rgba(120,160,255,0.10)'; ctx.lineWidth = 2;
  for (let x = 0; x < MAP_W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 188); ctx.lineTo(x, 372); ctx.stroke(); }
  // 중앙 가이드 라인
  ctx.strokeStyle = 'rgba(111,183,255,0.35)'; ctx.setLineDash([18, 14]); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 280); ctx.lineTo(MAP_W, 280); ctx.stroke(); ctx.setLineDash([]);

  // 벽 패널
  ctx.fillStyle = '#0e1830'; ctx.fillRect(0, 0, MAP_W, 188); ctx.fillRect(0, 372, MAP_W, MAP_H - 372);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
  for (let x = 0; x < MAP_W; x += 80) { ctx.strokeRect(x, 30, 80, 130); ctx.strokeRect(x, 400, 80, 120); }
  // 천장 조명
  for (let x = 60; x < MAP_W; x += 240) { const lg = ctx.createRadialGradient(x, 188, 0, x, 188, 120); lg.addColorStop(0, 'rgba(150,190,255,0.10)'); lg.addColorStop(1, 'rgba(150,190,255,0)'); ctx.fillStyle = lg; ctx.fillRect(x - 120, 130, 240, 120); }

  // 문 + 명패
  ctx.textAlign = 'center';
  for (const d of doors) {
    const top = d.top;
    const fx = d.x, fw = DOOR_W;
    const fy = top ? 96 : 388;          // 문틀 y
    const fh = 92;
    const lit = d.unlocked;
    // 문틀
    ctx.fillStyle = lit ? '#2a3a66' : '#1a2138';
    rr(ctx, fx, fy, fw, fh, 8); ctx.fill();
    ctx.strokeStyle = lit ? '#6fb7ff' : '#2c3650'; ctx.lineWidth = 2; rr(ctx, fx, fy, fw, fh, 8); ctx.stroke();
    // 문
    ctx.fillStyle = lit ? '#16213d' : '#141a2c';
    rr(ctx, fx + 12, fy + 10, fw - 24, fh - 20, 6); ctx.fill();
    if (lit) { // 빛 새어나옴
      const gg = ctx.createLinearGradient(0, fy, 0, fy + fh); gg.addColorStop(0, 'rgba(255,220,120,0.0)'); gg.addColorStop(1, 'rgba(255,220,120,0.22)');
      ctx.fillStyle = gg; rr(ctx, fx + 12, fy + 10, fw - 24, fh - 20, 6); ctx.fill();
    }
    // 아이콘
    ctx.font = '26px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(d.icon, fx + fw / 2, fy + fh / 2 + 2);
    // 명패
    const ny = top ? fy + fh + 6 : fy - 22;
    ctx.fillStyle = lit ? '#ffd11a' : '#26344f'; rr(ctx, fx + 8, ny, fw - 16, 20, 5); ctx.fill();
    ctx.fillStyle = lit ? '#2a1c00' : '#9aaccb'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText((lit ? '' : '🔒 ') + d.name, fx + fw / 2, ny + 14);
  }
  ctx.textAlign = 'start';
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
