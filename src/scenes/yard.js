// yard.js — 앞마당 씬 (집 밖). EDDIE 가 길에서 시작해 현관문까지 이동.
// 현관문 접촉 시 "학습을 시작하시겠습니까?" 알림 → 집 안으로.
// 배경(집/길/정원)은 고품질로 1회만 오프스크린 렌더 후 매 프레임 blit.

import { createWorld } from '../engine/topdown.js';
import { mountQuest } from '../app/quest.js';

const MAP_W = 900;
const MAP_H = 700;

// 집/문 좌표 (3/4 뷰)
const FX = 276, FY = 150, FW = 300, FH = 180;
const APEX = FX + FW / 2;                 // 426
const DX = APEX - 38, DY = FY + 58, DW = 76, DH = FH - 58;  // 문 388..464 / 208..330

export function showYard(root, { onDone }) {
  root.innerHTML = `
    <div class="scene game-scene scene-fade">
      <div class="world-host" id="world-host"></div>
      <div class="hud-top">
        <div class="brand"><span class="brand-dot"></span><strong>PlayHouse</strong><span class="crumb">앞마당</span></div>
      </div>
      <div class="hud-hint show" id="hud-hint">방향키 / WASD 로 <b>현관문</b>까지 이동하세요 🚪</div>
      <div class="hud-controls">⬆⬇⬅➡ 이동 · Space 상호작용</div>
    </div>
  `;

  mountQuest(root.querySelector('.game-scene'), {
    title: 'PlayHouse 입장',
    subtitle: 'EDDIE의 새 집에 도착했다',
    objectives: [{ text: '현관문 앞으로 이동하기', done: false }],
  });

  const host = root.querySelector('#world-host');

  const map = {
    width: MAP_W, height: MAP_H, bg: '#15522c',
    spawn: { x: 436, y: 600 },
    walls: [
      { x: FX, y: 300, w: DX - FX, h: 46 },            // 문 좌측 벽
      { x: DX + DW, y: 300, w: FX + FW - (DX + DW), h: 46 }, // 문 우측 벽
    ],
    triggers: [{ id: 'door', x: DX, y: 300, w: DW, h: 48, auto: true }],
    draw: drawYard,
  };

  const world = createWorld(host, map, {
    onAuto: (id) => { if (id === 'door') askEnter(); },
  });

  function askEnter() {
    world.pause();
    const m = document.createElement('div');
    m.className = 'modal-backdrop';
    m.innerHTML = `
      <div class="modal">
        <h3>🚪 PlayHouse 현관</h3>
        <p>집 안이 깜깜해요. <b>학습을 시작하시겠습니까?</b><br/>
          EDDIE와 함께 방마다 불을 켜며 스마트홈을 깨워봐요!</p>
        <div class="modal-actions">
          <button class="btn" id="later">잠깐만요</button>
          <button class="btn primary" id="enter">들어가기 ▶</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    m.querySelector('#later').onclick = () => { m.remove(); world.resume(); };
    m.querySelector('#enter').onclick = () => { m.remove(); world.destroy(); onDone?.(); };
  }
}

// ---- 배경 (1회 렌더) ----
let bgCanvas = null;
function drawYard(ctx) {
  if (!bgCanvas) bgCanvas = buildYardBg();
  ctx.drawImage(bgCanvas, 0, 0);
}

function buildYardBg() {
  const cv = document.createElement('canvas');
  cv.width = MAP_W; cv.height = MAP_H;
  const ctx = cv.getContext('2d');
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  const lg = (x0, y0, x1, y1, st) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); st.forEach((s) => g.addColorStop(s[0], s[1])); return g; };

  // 잔디
  ctx.fillStyle = lg(0, 0, 0, MAP_H, [[0, '#1f6b3a'], [1, '#13502a']]);
  ctx.fillRect(0, 0, MAP_W, MAP_H);
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < 460; i++) {
    const x = rnd() * MAP_W, y = 110 + rnd() * (MAP_H - 110);
    ctx.fillStyle = `rgba(${rnd() < 0.5 ? '12,70,36' : '120,200,120'},${0.04 + rnd() * 0.06})`;
    ctx.fillRect(x, y, 2, 5);
  }
  const flower = (x, y, col) => { ctx.fillStyle = col; for (let a = 0; a < 5; a++) { const an = a / 5 * 6.283; ctx.beginPath(); ctx.arc(x + Math.cos(an) * 4, y + Math.sin(an) * 4, 3, 0, 6.283); ctx.fill(); } ctx.fillStyle = '#ffd11a'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 6.283); ctx.fill(); };
  ['#ff7aa8', '#9b7bff', '#ff7aa8', '#ffffff', '#9b7bff'].forEach((c, i) => { flower(86 + i * 30, 540 + (i % 2) * 16, c); flower(720 + i * 26, 560 - (i % 2) * 14, c); });
  tree(ctx, 110, 470); tree(ctx, 800, 500);

  // 길 (원근 자갈)
  ctx.save();
  ctx.beginPath(); ctx.moveTo(396, 330); ctx.lineTo(504, 330); ctx.lineTo(580, MAP_H); ctx.lineTo(320, MAP_H); ctx.closePath();
  ctx.fillStyle = lg(0, 330, 0, MAP_H, [[0, '#b9a988'], [1, '#8d7c5c']]); ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(60,48,30,0.5)'; ctx.lineWidth = 3;
  for (let i = 0; i < 11; i++) { const y = 345 + i * 34; ctx.beginPath(); ctx.moveTo(280, y); ctx.lineTo(620, y); ctx.stroke(); }
  ctx.restore();

  const dx = 64, dy = -40, ridgeY = 72;

  // 집 그림자
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(FX + FW / 2 + 20, FY + FH + 18, 210, 30, 0, 0, 6.283); ctx.fill(); ctx.restore();

  // 우측 벽 (깊이)
  ctx.beginPath(); ctx.moveTo(FX + FW, FY); ctx.lineTo(FX + FW + dx, FY + dy); ctx.lineTo(FX + FW + dx, FY + FH + dy); ctx.lineTo(FX + FW, FY + FH); ctx.closePath();
  ctx.fillStyle = lg(FX + FW, 0, FX + FW + dx, 0, [[0, '#c8a974'], [1, '#a9854f']]); ctx.fill();
  // 정면 벽
  rr(FX, FY, FW, FH, 4); ctx.fillStyle = lg(FX, FY, FX, FY + FH, [[0, '#f6e6c4'], [1, '#dcc295']]); ctx.fill();
  ctx.strokeStyle = '#b89a66'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(90,60,30,0.18)'; ctx.fillRect(FX, FY, FW, 16);

  // 지붕
  ctx.beginPath(); ctx.moveTo(APEX, ridgeY); ctx.lineTo(APEX + dx, ridgeY + dy); ctx.lineTo(FX + FW + dx, FY + dy); ctx.lineTo(FX + FW, FY); ctx.closePath();
  ctx.fillStyle = lg(APEX, ridgeY, FX + FW + dx, FY, [[0, '#9e4634'], [1, '#7a3526']]); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.moveTo(APEX, ridgeY); ctx.lineTo(FX + FW, FY); ctx.lineTo(FX, FY); ctx.closePath();
  ctx.fillStyle = lg(APEX, ridgeY, FX, FY, [[0, '#c85a42'], [1, '#a4452f']]); ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(60,24,16,0.35)'; ctx.lineWidth = 2;
  for (let i = 1; i < 7; i++) { const y = ridgeY + i * ((FY - ridgeY) / 7); ctx.beginPath(); ctx.moveTo(FX - 10, y); ctx.lineTo(FX + FW + 10, y); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = '#6f2c1e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(APEX, ridgeY); ctx.lineTo(FX, FY); ctx.lineTo(FX + FW, FY); ctx.closePath(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,200,170,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(APEX, ridgeY); ctx.lineTo(APEX + dx, ridgeY + dy); ctx.stroke();
  ctx.fillStyle = '#5f2618'; ctx.fillRect(FX - 8, FY - 3, FW + 16, 6);
  // 굴뚝
  ctx.fillStyle = '#8a5a3a'; ctx.fillRect(FX + FW - 70, ridgeY + 6, 26, 46); ctx.fillStyle = '#6b4329'; ctx.fillRect(FX + FW - 74, ridgeY + 2, 34, 10);

  // 간판
  ctx.save(); ctx.fillStyle = '#2c3550'; rr(APEX - 66, FY - 118, 132, 30, 8); ctx.fill(); ctx.strokeStyle = '#1b2236'; ctx.stroke();
  ctx.fillStyle = '#ffd64a'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PlayHouse', APEX, FY - 97); ctx.restore();

  // 창문
  const win = (x, y, w, h) => {
    ctx.fillStyle = '#f3efe4'; rr(x - 5, y - 5, w + 10, h + 10, 6); ctx.fill();
    ctx.fillStyle = lg(x, y, x + w, y + h, [[0, '#bfe6ff'], [1, '#6fa8dd']]); rr(x, y, w, h, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,238,170,0.5)'; rr(x, y + h * 0.55, w, h * 0.45, 4); ctx.fill();
    ctx.strokeStyle = '#f3efe4'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
    ctx.fillStyle = '#cdb98a'; ctx.fillRect(x - 7, y + h + 5, w + 14, 6);
  };
  win(FX + 30, FY + 52, 70, 64);
  win(FX + FW - 100, FY + 52, 70, 64);

  // 문
  ctx.fillStyle = '#6b4420'; rr(DX - 7, DY - 7, DW + 14, DH + 7, 8); ctx.fill();
  ctx.fillStyle = lg(DX, DY, DX + DW, DY, [[0, '#a06a32'], [0.5, '#8a5a2b'], [1, '#6f471f']]); rr(DX, DY, DW, DH, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(50,30,12,0.5)'; ctx.lineWidth = 2;
  rr(DX + 10, DY + 12, DW - 20, DH * 0.4, 4); ctx.stroke(); rr(DX + 10, DY + DH * 0.5, DW - 20, DH * 0.38, 4); ctx.stroke();
  ctx.fillStyle = '#1a2433'; ctx.beginPath(); ctx.arc(DX + DW / 2, DY + 18, 9, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#9fd6ff'; ctx.beginPath(); ctx.arc(DX + DW / 2, DY + 18, 6, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#ffd54a'; ctx.beginPath(); ctx.arc(DX + DW - 14, DY + DH / 2, 4, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(255,210,120,0.25)'; ctx.beginPath(); ctx.ellipse(DX + DW / 2, DY + DH + 10, 70, 22, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#cdb98a'; rr(DX - 16, DY + DH, DW + 32, 12, 4); ctx.fill();

  // 랜턴
  ctx.fillStyle = '#33405a'; ctx.fillRect(DX + DW + 18, DY + 30, 6, 40);
  ctx.fillStyle = '#ffd54a'; rr(DX + DW + 12, DY + 22, 22, 18, 4); ctx.fill();
  ctx.fillStyle = 'rgba(255,210,120,0.35)'; ctx.beginPath(); ctx.arc(DX + DW + 23, DY + 31, 26, 0, 6.283); ctx.fill();

  // 덤불
  bush(ctx, FX - 20, FY + FH + 6, 26); bush(ctx, FX + FW + 30, FY + FH + 2, 30);

  // 비네트
  const vg = ctx.createRadialGradient(MAP_W / 2, MAP_H * 0.4, 220, MAP_W / 2, MAP_H * 0.5, MAP_W * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, MAP_W, MAP_H);
  return cv;
}

function tree(ctx, x, y) {
  ctx.fillStyle = '#5a3a2a'; ctx.fillRect(x - 8, y, 16, 46);
  ctx.fillStyle = '#1b5230'; ctx.beginPath(); ctx.arc(x, y - 8, 34, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#27693c'; ctx.beginPath(); ctx.arc(x - 14, y + 2, 24, 0, 6.283); ctx.arc(x + 14, y - 2, 26, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(160,220,150,0.25)'; ctx.beginPath(); ctx.arc(x - 6, y - 16, 14, 0, 6.283); ctx.fill();
}
function bush(ctx, x, y, r) {
  ctx.fillStyle = '#1f5a32'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.arc(x - r * 0.7, y + 4, r * 0.7, 0, 6.283); ctx.arc(x + r * 0.7, y + 4, r * 0.7, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#2a6e3f'; ctx.beginPath(); ctx.arc(x - 3, y - 3, r * 0.5, 0, 6.283); ctx.fill();
}
