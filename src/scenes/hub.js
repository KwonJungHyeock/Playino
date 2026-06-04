// hub.js — Playino : Escape Room · 연구소 복도(HUB). 4개 챕터 입구(게이트).
// 어둠 속 EDDIE의 눈빛(손전등)만이 빛. 챕터를 클리어할수록 복도가 밝아진다(탈출 진척).
// 잠긴 챕터는 직전 챕터를 모두 통과해야 열린다.

import { createWorld } from '../engine/topdown.js';
import { mountSay, eddieRandom } from '../app/eddieSay.js';
import { mountCurriculumHeader } from '../app/curriculumHeader.js';
import { CHAPTERS, getChapter, chapterDone, chapterUnlocked, chapterClearedCount, chapterTotal } from '../content/curriculum.js';

const MAP_H = 560;
const GATE_W = 156, GAP = 250, START = 120;
const TOP_Y = 250;   // 게이트 앞 트리거 y(복도)

export function showHub(root, { onEnter, spawnAt } = {}) {
  const gates = CHAPTERS.map((c, i) => ({ ...c, x: START + i * GAP, y: TOP_Y }));
  const MAP_W = START + CHAPTERS.length * GAP + 40;

  let spawnPt = { x: 140, y: 320 };
  if (spawnAt) { const g = gates.find((x) => x.id === spawnAt); if (g) spawnPt = { x: g.x + GATE_W / 2 - 14, y: 320 }; }

  root.innerHTML = `
    <div class="scene game-scene scene-fade escape-scene">
      <div class="world-host" id="world-host"></div>
      <div class="hud-hint" id="hud-hint"></div>
      <div class="hud-toast" id="hud-toast"></div>
      <div class="hud-narrate" id="hud-narrate"></div>
      <div class="hud-controls">⬅➡ 이동 · Space 입장 · EDDIE 클릭 · 상단에서 챕터 이동</div>
    </div>`;

  const header = mountCurriculumHeader(root.querySelector('.escape-scene'), {
    active: null, crumb: '연구소 복도 (탈출)',
    onChapter: (id) => tryEnter(id),
  });

  const hintEl = root.querySelector('#hud-hint');
  const toastEl = root.querySelector('#hud-toast');
  const narrateEl = root.querySelector('#hud-narrate');
  const say = mountSay(root.querySelector('.game-scene'));

  const dark = document.createElement('canvas');
  const dctx = dark.getContext('2d');

  const map = {
    width: MAP_W, height: MAP_H, bg: '#04060c',
    spawn: spawnPt,
    walls: [
      { x: 0, y: 0, w: MAP_W, h: 196 },
      { x: 0, y: 392, w: MAP_W, h: MAP_H - 392 },
      { x: 0, y: 0, w: 18, h: MAP_H }, { x: MAP_W - 18, y: 0, w: 18, h: MAP_H },
    ],
    triggers: gates.map((g) => ({ id: g.id, x: g.x, y: g.y, w: GATE_W, h: 54 })),
    draw: (ctx, st) => drawHub(ctx, st, gates, MAP_W),
  };

  const world = createWorld(root.querySelector('#world-host'), map, {
    onInteract: tryEnter,
    onFrame: updateHint,
    onEddieClick: (x, y) => say(eddieRandom(), x, y),
    onDrawOverlay: drawDark,
  });

  setTimeout(() => narrate('여기서… 나가야 해. 복도의 잠긴 챕터를 하나씩 풀어 시스템을 복구하자.'), 500);

  function tryEnter(id) {
    const c = getChapter(id); if (!c) return;
    if (!chapterUnlocked(id)) { toast(`🔒 ${c.short} — 이전 챕터를 먼저 통과해야 열려요`); return; }
    world.destroy(); header.destroy(); onEnter?.(id);
  }

  function updateHint(state) {
    const tr = state.activeTrigger;
    if (!tr) { hintEl.classList.remove('show'); return; }
    const c = getChapter(tr.id); if (!c) { hintEl.classList.remove('show'); return; }
    const unlocked = chapterUnlocked(c.id), done = chapterDone(c.id);
    hintEl.innerHTML = unlocked
      ? `▶ Space · <b>${c.label}</b> 입장 ${done ? '✓' : `(${chapterClearedCount(c.id)}/${chapterTotal(c.id)})`}`
      : `🔒 ${c.label} (이전 챕터 먼저)`;
    hintEl.classList.add('show');
  }

  let tT = null, nT = null;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => toastEl.classList.remove('show'), 2400); }
  function narrate(t) { narrateEl.innerHTML = `<span>🤖 ${t}</span>`; narrateEl.classList.add('show'); clearTimeout(nT); nT = setTimeout(() => narrateEl.classList.remove('show'), 5000); }

  // 어둠: 클리어한 챕터 수만큼 복도가 밝아진다(EDDIE 손전등 + 게이트 빛 홀)
  function drawDark(ctx, st, canvas) {
    const doneN = CHAPTERS.filter((c) => chapterDone(c.id)).length;
    const baseDark = Math.max(0.28, 0.9 - doneN * 0.16);   // 풀수록 옅어짐
    if (dark.width !== canvas.width || dark.height !== canvas.height) { dark.width = canvas.width; dark.height = canvas.height; }
    const cam = st.cam, p = st.player;
    dctx.clearRect(0, 0, dark.width, dark.height);
    dctx.fillStyle = `rgba(2,4,10,${baseDark})`; dctx.fillRect(0, 0, dark.width, dark.height);
    dctx.globalCompositeOperation = 'destination-out';
    hole(dctx, p.x + p.w / 2 - cam.x, p.y + p.h / 2 - cam.y, 175);
    for (const g of gates) { if (chapterDone(g.id) || chapterUnlocked(g.id)) hole(dctx, g.x + GATE_W / 2 - cam.x, 196 - cam.y, chapterDone(g.id) ? 200 : 120); }
    dctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(dark, 0, 0);
  }
}

function hole(c, x, y, r) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.62, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}

function drawHub(ctx, st, gates, MAP_W) {
  const t = st?.t || 0;
  // 콘크리트 복도
  ctx.fillStyle = '#070a12'; ctx.fillRect(0, 0, MAP_W, MAP_H);
  const cf = ctx.createLinearGradient(0, 196, 0, 392);
  cf.addColorStop(0, '#141a2a'); cf.addColorStop(0.5, '#1a2236'); cf.addColorStop(1, '#101626');
  ctx.fillStyle = cf; ctx.fillRect(0, 196, MAP_W, 196);
  // 바닥 타일 결
  ctx.strokeStyle = 'rgba(120,150,210,0.05)'; ctx.lineWidth = 1;
  for (let x = 0; x < MAP_W; x += 56) { ctx.beginPath(); ctx.moveTo(x, 198); ctx.lineTo(x, 390); ctx.stroke(); }
  for (let y = 220; y < 392; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_W, y); ctx.stroke(); }
  // 벽 패널(상/하)
  const band = (y, h) => { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#0c111d'); g.addColorStop(1, '#070a12'); ctx.fillStyle = g; ctx.fillRect(0, y, MAP_W, h); };
  band(0, 196); band(392, MAP_H - 392);
  ctx.fillStyle = 'rgba(90,120,180,0.12)'; ctx.fillRect(0, 194, MAP_W, 2); ctx.fillRect(0, 392, MAP_W, 2);

  // 비상등(깜빡이는 앰버) — 천장
  for (let x = 90; x < MAP_W; x += GAP) {
    const blink = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.08 + x));
    const g = ctx.createRadialGradient(x, 150, 2, x, 150, 70);
    g.addColorStop(0, `rgba(255,176,32,${blink})`); g.addColorStop(1, 'rgba(255,176,32,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, 150, 70, 0, 6.283); ctx.fill();
    ctx.fillStyle = `rgba(255,200,90,${0.6 * blink})`; ctx.beginPath(); ctx.arc(x, 150, 5, 0, 6.283); ctx.fill();
  }

  // 게이트
  ctx.textAlign = 'center';
  for (const g of gates) {
    const unlocked = chapterUnlocked(g.id), done = chapterDone(g.id);
    const fx = g.x, fy = 96, fw = GATE_W, fh = 104;
    const accent = done ? '61,220,145' : unlocked ? '255,176,32' : '120,60,60';
    if (unlocked || done) { const lg = ctx.createRadialGradient(fx + fw / 2, fy + fh / 2, 6, fx + fw / 2, fy + fh / 2, 100); lg.addColorStop(0, `rgba(${accent},0.30)`); lg.addColorStop(1, `rgba(${accent},0)`); ctx.fillStyle = lg; ctx.fillRect(fx - 34, fy - 34, fw + 68, fh + 68); }
    // 문틀
    const ff = ctx.createLinearGradient(fx, fy, fx, fy + fh); ff.addColorStop(0, unlocked ? '#26324f' : '#1a1620'); ff.addColorStop(1, unlocked ? '#161f36' : '#120e16');
    ctx.fillStyle = ff; rr(ctx, fx, fy, fw, fh, 12); ctx.fill();
    ctx.strokeStyle = `rgba(${accent},${unlocked ? 0.9 : 0.55})`; ctx.lineWidth = 2; rr(ctx, fx, fy, fw, fh, 12); ctx.stroke();
    // 문 내부(어두운 통로)
    const gg = ctx.createLinearGradient(0, fy + 12, 0, fy + fh - 12); gg.addColorStop(0, 'rgba(6,10,18,0.95)'); gg.addColorStop(1, done ? 'rgba(61,220,145,0.18)' : unlocked ? 'rgba(255,176,32,0.12)' : 'rgba(6,8,14,0.95)');
    ctx.fillStyle = gg; rr(ctx, fx + 12, fy + 12, fw - 24, fh - 24, 8); ctx.fill();
    // 아이콘 / 잠금
    ctx.font = '34px sans-serif'; ctx.fillStyle = unlocked ? '#fff' : '#6a4a4a';
    ctx.fillText(done ? '✓' : unlocked ? g.icon : '🔒', fx + fw / 2, fy + 50);
    // 라벨 칩
    ctx.font = '600 13px "Space Grotesk", sans-serif';
    const label = g.label;
    const lw = ctx.measureText(label).width + 22;
    ctx.fillStyle = done ? 'rgba(61,220,145,0.2)' : unlocked ? 'rgba(255,176,32,0.16)' : 'rgba(20,16,22,0.85)';
    rr(ctx, fx + fw / 2 - lw / 2, fy + fh + 8, lw, 24, 12); ctx.fill();
    ctx.fillStyle = done ? '#bfffd9' : unlocked ? '#ffe2a8' : '#9a8088'; ctx.fillText(label, fx + fw / 2, fy + fh + 24);
    // 탈출 서사 서브
    ctx.font = '11px "Space Grotesk", sans-serif'; ctx.fillStyle = 'rgba(180,190,210,0.5)';
    ctx.fillText(`ACT ${g.no} · ${g.act}`, fx + fw / 2, fy + fh + 44);
  }
  ctx.textAlign = 'start';
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
