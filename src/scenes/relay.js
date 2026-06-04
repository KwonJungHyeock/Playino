// relay.js — 릴레이 학습방. 릴레이로 '환풍기'를 제어한다.
// 코딩 → 미션(켜기/주기 신호) → 클리어. room.js 패널(버튼/블록/코드) 재사용.

import { createWorld } from '../engine/topdown.js';
import { openRoom } from './room.js';
import { mountQuest } from '../app/quest.js';
import { progress } from '../app/progress.js';
import { mountSay, eddieRandom } from '../app/eddieSay.js';
import { floor, walls, vignette, chip, roundRect } from '../engine/style.js';

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
    onEddieClick: (x, y) => say(eddieRandom(), x, y),
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
    onDrawOverlay: (ctx, _s, canvas) => vignette(ctx, canvas, 0.46),
  });

  let tT = null;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => toastEl.classList.remove('show'), 2400); }
}

function drawRelay(ctx, cleared) {
  floor(ctx, MAP_W, MAP_H, ['#101a30', '#16233c', '#0d1626']);
  walls(ctx, MAP_W, MAP_H);
  // 릴레이 → 전등 (글래스 받침 + 발광 램프)
  const cx = DEVICE.x + DEVICE.w / 2, cy = DEVICE.y + DEVICE.h / 2;
  const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 96); g.addColorStop(0, 'rgba(255,225,120,0.42)'); g.addColorStop(0.6, 'rgba(255,225,120,0.12)'); g.addColorStop(1, 'rgba(255,225,120,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 96, 0, 6.283); ctx.fill();
  const bg = ctx.createLinearGradient(DEVICE.x, DEVICE.y, DEVICE.x, DEVICE.y + DEVICE.h); bg.addColorStop(0, '#34425f'); bg.addColorStop(1, '#1c2740');
  ctx.fillStyle = bg; roundRect(ctx, DEVICE.x, DEVICE.y, DEVICE.w, DEVICE.h, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(255,225,120,0.6)'; ctx.lineWidth = 2; roundRect(ctx, DEVICE.x, DEVICE.y, DEVICE.w, DEVICE.h, 16); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(DEVICE.x + 12, DEVICE.y + 10); ctx.lineTo(DEVICE.x + DEVICE.w - 12, DEVICE.y + 10); ctx.stroke();
  ctx.save(); ctx.shadowColor = 'rgba(255,225,120,0.85)'; ctx.shadowBlur = 18; ctx.font = '38px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('💡', cx, cy + 14); ctx.restore();
  chip(ctx, cx, DEVICE.y + DEVICE.h + 8, '🔌 릴레이 → 전등', { bg: 'rgba(255,225,120,0.16)', fg: '#ffe9b0' });
  if (cleared) { ctx.save(); ctx.shadowColor = 'rgba(61,220,145,0.8)'; ctx.shadowBlur = 10; ctx.fillStyle = '#3ddc91'; ctx.beginPath(); ctx.arc(DEVICE.x + DEVICE.w - 10, DEVICE.y + 10, 12, 0, 6.283); ctx.fill(); ctx.restore(); ctx.fillStyle = '#08210f'; ctx.textAlign = 'center'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('✓', DEVICE.x + DEVICE.w - 10, DEVICE.y + 15); }
  // 나가기
  const eg = ctx.createLinearGradient(EXIT.x, MAP_H - 30, EXIT.x, MAP_H - 6); eg.addColorStop(0, '#2c3c68'); eg.addColorStop(1, '#1b2740');
  ctx.fillStyle = eg; roundRect(ctx, EXIT.x - 6, MAP_H - 30, EXIT.w + 12, 26, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(111,183,255,0.6)'; ctx.lineWidth = 1.5; roundRect(ctx, EXIT.x - 6, MAP_H - 30, EXIT.w + 12, 26, 8); ctx.stroke();
  ctx.fillStyle = '#cfe0ff'; ctx.font = 'bold 12px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🚪 복도로', EXIT.x + EXIT.w / 2, MAP_H - 13);
  ctx.textAlign = 'start';
}
