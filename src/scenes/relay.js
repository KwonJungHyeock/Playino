// relay.js — 릴레이 학습방. 릴레이로 '환풍기'를 제어한다.
// 코딩 → 미션(켜기/주기 신호) → 클리어. room.js 패널(버튼/블록/코드) 재사용.

import { createWorld } from '../engine/topdown.js';
import { openRoom } from './room.js';
import { mountQuest } from '../app/quest.js';
import { progress } from '../app/progress.js';
import { mountSay, eddieRandom } from '../app/eddieSay.js';

const MAP_W = 820, MAP_H = 560;
const DEVICE = { x: 370, y: 150, w: 80, h: 80 };   // 릴레이/환풍기
const EXIT = { x: 378, y: MAP_H - 56, w: 64, h: 38 };

const RELAY_ROOM = {
  id: 'relay', name: '릴레이', pin: 7, concept: '디지털 출력(릴레이 스위치)', blockSet: 'relay',
  intro: '릴레이는 작은 신호로 큰 전원을 켜고 끄는 스위치예요. 릴레이로 전등을 켜보자!',
  missions: [
    {
      id: 'on', type: 'play', title: '릴레이로 전등 켜기', goal: 'on', concept: 'digitalWrite',
      story: '버튼/코드로 릴레이를 ON 하면 연결된 전등이 켜져요.',
      hint: 'digitalWrite(7, HIGH) 로 릴레이 ON → 전등 켜짐.',
      base: 'void setup() {\n  pinMode(7, OUTPUT);   // 릴레이 IN\n}\n\nvoid loop() {\n  digitalWrite(7, HIGH);   // 릴레이 ON\n}\n',
    },
    {
      id: 'cycle', type: 'challenge', title: '자동 점멸 경고등 만들기', goal: 'blink', want: { maxDelay: 500 },
      concept: 'delay', challenge: 'delay 를 500 이하로 줄여 전등을 깜빡이는 경고등으로!',
      story: '릴레이를 주기적으로 ON/OFF 해 깜빡이는 경고등을 만들자.',
      hint: 'ON → delay → OFF → delay 반복. delay 숫자를 500 이하로.',
      base: 'void setup() {\n  pinMode(7, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(7, HIGH);   // ON\n  delay(800);\n  digitalWrite(7, LOW);    // OFF\n  delay(800);\n}\n',
    },
  ],
};

export function showRelay(root, { onExit } = {}) {
  let cleared = progress.isCleared('relay');

  root.innerHTML = `
    <div class="scene game-scene scene-fade">
      <div class="world-host" id="world-host"></div>
      <div class="hud-top">
        <div class="brand"><span class="brand-dot"></span><strong>Eduino AI</strong><span class="brand-sep">:</span><b class="brand-sub">릴레이</b><span class="crumb">전등 스위치</span></div>
        <button class="btn btn-sm" id="rl-exit">🚪 복도로</button>
      </div>
      <div class="hud-hint" id="hud-hint"></div>
      <div class="hud-toast" id="hud-toast"></div>
      <div class="hud-controls">⬆⬇⬅➡ 이동 · Space · 장치 앞에서 학습 · EDDIE 클릭</div>
    </div>`;
  const hintEl = root.querySelector('#hud-hint');
  const toastEl = root.querySelector('#hud-toast');
  const say = mountSay(root.querySelector('.game-scene'));
  mountQuest(root.querySelector('.game-scene'), { title: '릴레이 스위치', subtitle: '전등을 켜고 경고등까지!', objectives: [{ text: '릴레이로 전등 켜기', done: cleared }, { text: '자동 점멸 경고등', done: cleared }] });
  root.querySelector('#rl-exit').onclick = () => { world.destroy(); onExit?.(); };

  const map = {
    width: MAP_W, height: MAP_H, bg: '#0c1322',
    spawn: { x: 400, y: 380 },
    walls: [{ x: 0, y: 0, w: MAP_W, h: 24 }, { x: 0, y: MAP_H - 24, w: MAP_W, h: 24 }, { x: 0, y: 0, w: 24, h: MAP_H }, { x: MAP_W - 24, y: 0, w: 24, h: MAP_H }, { ...DEVICE }],
    triggers: [{ id: 'device', x: DEVICE.x, y: DEVICE.y + DEVICE.h, w: DEVICE.w, h: 40 }, { id: 'exit', ...EXIT }],
    draw: (ctx) => drawRelay(ctx, cleared),
  };

  const world = createWorld(root.querySelector('#world-host'), map, {
    onEddieClick: () => say(eddieRandom()),
    onInteract: (id) => {
      if (id === 'exit') { world.destroy(); onExit?.(); return; }
      if (id === 'device') {
        world.pause();
        openRoom(RELAY_ROOM, { onComplete: () => { cleared = true; progress.mark('relay'); toast('🎉 릴레이 방 미션 클리어!'); world.resume(); }, onClose: () => world.resume() });
      }
    },
    onFrame: (st) => {
      const tr = st.activeTrigger;
      if (!tr) { hintEl.classList.remove('show'); return; }
      hintEl.innerHTML = tr.id === 'device' ? '🔌 Space · 릴레이로 전등 제어 학습' : '🚪 Space · 복도로';
      hintEl.classList.add('show');
    },
  });

  let tT = null;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => toastEl.classList.remove('show'), 2400); }
}

function drawRelay(ctx, cleared) {
  ctx.fillStyle = '#1c2336'; ctx.fillRect(0, 0, MAP_W, MAP_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
  for (let x = 0; x < MAP_W; x += 44) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_H); ctx.stroke(); }
  for (let y = 0; y < MAP_H; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_W, y); ctx.stroke(); }
  ctx.fillStyle = '#2b3552'; ctx.fillRect(0, 0, MAP_W, 24); ctx.fillRect(0, MAP_H - 24, MAP_W, 24); ctx.fillRect(0, 0, 24, MAP_H); ctx.fillRect(MAP_W - 24, 0, 24, MAP_H);
  // 릴레이 + 전등(램프)
  const cx = DEVICE.x + DEVICE.w / 2, cy = DEVICE.y + DEVICE.h / 2;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 70); g.addColorStop(0, 'rgba(255,225,120,0.35)'); g.addColorStop(1, 'rgba(255,225,120,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 70, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#3a4a66'; rr(ctx, DEVICE.x, DEVICE.y, DEVICE.w, DEVICE.h, 12); ctx.fill();
  ctx.strokeStyle = '#6fb7ff'; ctx.lineWidth = 2; rr(ctx, DEVICE.x, DEVICE.y, DEVICE.w, DEVICE.h, 12); ctx.stroke();
  ctx.fillStyle = '#cfe0ff'; ctx.font = '34px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('💡', cx, cy + 10);
  ctx.font = 'bold 13px sans-serif'; ctx.fillText('릴레이 → 전등', cx, DEVICE.y + DEVICE.h + 26);
  if (cleared) { ctx.fillStyle = '#3ddc91'; ctx.beginPath(); ctx.arc(DEVICE.x + DEVICE.w - 8, DEVICE.y + 8, 11, 0, 6.283); ctx.fill(); ctx.fillStyle = '#08172e'; ctx.fillText('✓', DEVICE.x + DEVICE.w - 8, DEVICE.y + 13); }
  ctx.fillStyle = '#5a3a2a'; rr(ctx, EXIT.x - 6, MAP_H - 28, EXIT.w + 12, 24, 5); ctx.fill();
  ctx.fillStyle = '#caa15a'; rr(ctx, EXIT.x, MAP_H - 24, EXIT.w, 18, 4); ctx.fill();
  ctx.fillStyle = '#cfe0ff'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('🚪 복도로', EXIT.x + EXIT.w / 2, MAP_H - 36);
  ctx.textAlign = 'start';
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
