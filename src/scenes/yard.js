// yard.js — 앞마당 씬 (집 밖). EDDIE 가 대문에서 시작해 현관문까지 이동.
// 현관문 접촉 시 "학습을 시작하시겠습니까?" 알림 → 집 안으로.

import { createWorld } from '../engine/topdown.js';

const MAP_W = 900;
const MAP_H = 700;

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

  const host = root.querySelector('#world-host');

  const map = {
    width: MAP_W, height: MAP_H, bg: '#0c1a14',
    spawn: { x: 436, y: 590 },
    walls: [
      { x: 250, y: 250, w: 165, h: 64 },   // 현관 좌측 벽
      { x: 485, y: 250, w: 165, h: 64 },   // 현관 우측 벽
    ],
    triggers: [
      { id: 'door', x: 416, y: 296, w: 68, h: 40, auto: true },
    ],
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

function drawYard(ctx) {
  // 잔디
  ctx.fillStyle = '#16361f';
  ctx.fillRect(0, 0, MAP_W, MAP_H);
  ctx.fillStyle = '#1b3f25';
  for (let y = 0; y < MAP_H; y += 46) {
    for (let x = (y % 92 === 0 ? 0 : 23); x < MAP_W; x += 46) {
      ctx.fillRect(x, y, 22, 22);
    }
  }

  // 길 (현관문 → 아래)
  ctx.fillStyle = '#7c6a4a';
  ctx.fillRect(406, 320, 88, MAP_H - 320);
  ctx.fillStyle = '#8d7954';
  for (let y = 330; y < MAP_H; y += 40) ctx.fillRect(410, y, 80, 26);

  // 집 본체
  roundRect(ctx, 250, 70, 400, 244, 10);
  ctx.fillStyle = '#3a4a66'; ctx.fill();
  ctx.strokeStyle = '#26344f'; ctx.lineWidth = 3; ctx.stroke();

  // 지붕
  ctx.beginPath();
  ctx.moveTo(228, 96); ctx.lineTo(450, 6); ctx.lineTo(672, 96);
  ctx.closePath();
  ctx.fillStyle = '#5a3a2a'; ctx.fill();
  ctx.strokeStyle = '#3e2a1f'; ctx.stroke();

  // 간판
  ctx.fillStyle = '#ffd11a';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PlayHouse', 450, 150);

  // 창문
  ctx.fillStyle = '#9fd6ff';
  roundRect(ctx, 300, 170, 70, 60, 8); ctx.fill();
  roundRect(ctx, 530, 170, 70, 60, 8); ctx.fill();
  ctx.strokeStyle = '#26344f'; ctx.lineWidth = 2;
  roundRect(ctx, 300, 170, 70, 60, 8); ctx.stroke();
  roundRect(ctx, 530, 170, 70, 60, 8); ctx.stroke();

  // 현관문
  roundRect(ctx, 416, 196, 68, 118, 8);
  ctx.fillStyle = '#caa15a'; ctx.fill();
  ctx.strokeStyle = '#7a5e2e'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#7a5e2e';
  ctx.beginPath(); ctx.arc(472, 256, 4, 0, Math.PI * 2); ctx.fill();

  // 나무
  tree(ctx, 130, 200); tree(ctx, 770, 230); tree(ctx, 150, 470); tree(ctx, 760, 500);

  ctx.textAlign = 'start';
}

function tree(ctx, x, y) {
  ctx.fillStyle = '#5a3a2a';
  ctx.fillRect(x - 7, y, 14, 40);
  ctx.fillStyle = '#1f5a32';
  ctx.beginPath(); ctx.arc(x, y - 6, 30, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a6e3f';
  ctx.beginPath(); ctx.arc(x - 12, y, 20, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 12, y - 2, 22, 0, Math.PI * 2); ctx.fill();
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
