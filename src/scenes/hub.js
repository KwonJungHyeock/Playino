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
    active: null, crumb: '미니게임 광장',
    onChapter: (id) => tryEnter(id),
  });

  const hintEl = root.querySelector('#hud-hint');
  const toastEl = root.querySelector('#hud-toast');
  const narrateEl = root.querySelector('#hud-narrate');
  const say = mountSay(root.querySelector('.game-scene'));

  const dark = document.createElement('canvas');
  const dctx = dark.getContext('2d');

  const map = {
    width: MAP_W, height: MAP_H, bg: '#bfe3ff',
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

  setTimeout(() => narrate('미니게임천국에 온 걸 환영해! 🎉 스테이지를 골라 미니게임을 즐기자!'), 500);

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

  // 밝은 톤: 호러 어둠 제거 → 은은한 비네트만
  function drawDark(ctx, st, canvas) {
    const g = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.46, canvas.height * 0.42, canvas.width / 2, canvas.height / 2, canvas.height * 0.98);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(30,12,50,0.2)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

const hubImg = new Image(); hubImg.src = '/brand/hub-bg.png';   // 일러스트 광장(있으면 사용)
const PAL = ['255,200,74', '255,122,184', '90,201,255', '155,140,255'];   // 챕터별 캔디 컬러

function drawCover(ctx, img, W, H) {
  const ir = img.naturalWidth / img.naturalHeight, r = W / H;
  let dw, dh; if (ir > r) { dh = H; dw = H * ir; } else { dw = W; dh = W / ir; }
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

function drawHub(ctx, st, gates, MAP_W) {
  const t = st?.t || 0;
  if (hubImg.complete && hubImg.naturalWidth) {
    drawCover(ctx, hubImg, MAP_W, MAP_H);                       // 일러스트 광장
  } else {
    // 절차적 광장(폴백)
    const sky = ctx.createLinearGradient(0, 0, 0, 200); sky.addColorStop(0, '#bfe6ff'); sky.addColorStop(1, '#ffe6f1');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, MAP_W, 200);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < MAP_W / 320 + 1; i++) cloud(ctx, 120 + i * 320 + (t * 0.15) % 320, 60 + (i % 2) * 26);
    const fl = ctx.createLinearGradient(0, 200, 0, 392); fl.addColorStop(0, '#ffe7bd'); fl.addColorStop(1, '#f3cd92');
    ctx.fillStyle = fl; ctx.fillRect(0, 200, MAP_W, 192);
    const gr = ctx.createLinearGradient(0, 392, 0, MAP_H); gr.addColorStop(0, '#92d97e'); gr.addColorStop(1, '#6fbf5e');
    ctx.fillStyle = gr; ctx.fillRect(0, 392, MAP_W, MAP_H - 392);
    bunting(ctx, MAP_W, t);
  }
  // 스테이지 사인 게이트(어떤 배경에서도 또렷)
  for (let i = 0; i < gates.length; i++) drawStageSign(ctx, gates[i], i);
  ctx.textAlign = 'start';
}

function drawStageSign(ctx, g, i) {
  const fx = g.x, fw = GATE_W, cx = fx + fw / 2;
  const unlocked = chapterUnlocked(g.id), done = chapterDone(g.id);
  const col = unlocked ? PAL[i % PAL.length] : '165,168,178';
  const py = 84, ph = 128;
  ctx.textAlign = 'center';
  if (unlocked) {
    const lg = ctx.createRadialGradient(cx, py + ph * 0.5, 8, cx, py + ph * 0.5, 120);
    lg.addColorStop(0, `rgba(${col},0.32)`); lg.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = lg; ctx.fillRect(fx - 44, py - 30, fw + 88, ph + 96);
    const fgr = ctx.createRadialGradient(cx, py + ph + 8, 4, cx, py + ph + 8, 70);
    fgr.addColorStop(0, `rgba(${col},0.5)`); fgr.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = fgr; ctx.beginPath(); ctx.ellipse(cx, py + ph + 12, 64, 18, 0, 0, 6.283); ctx.fill();
  }
  const pf = ctx.createLinearGradient(fx, py, fx, py + ph);
  pf.addColorStop(0, 'rgba(22,28,46,0.84)'); pf.addColorStop(1, 'rgba(12,16,28,0.88)');
  ctx.fillStyle = pf; rr(ctx, fx, py, fw, ph, 16); ctx.fill();
  ctx.strokeStyle = `rgba(${col},${unlocked ? 0.95 : 0.55})`; ctx.lineWidth = 2.5; rr(ctx, fx, py, fw, ph, 16); ctx.stroke();
  ctx.fillStyle = `rgba(${col},${unlocked ? 0.95 : 0.5})`; rr(ctx, fx + 10, py + 10, fw - 20, 24, 8); ctx.fill();
  ctx.fillStyle = unlocked ? '#10131f' : '#33363f'; ctx.font = '800 12px "Space Grotesk", sans-serif';
  ctx.fillText(`STAGE ${g.no}${done ? ' ✓' : ''}`, cx, py + 27);
  ctx.save(); if (unlocked && !done) { ctx.shadowColor = `rgba(${col},0.8)`; ctx.shadowBlur = 14; }
  ctx.font = '40px sans-serif'; ctx.fillStyle = '#fff';
  ctx.fillText(done ? '✅' : unlocked ? g.icon : '🔒', cx, py + 84); ctx.restore();
  ctx.font = '700 13px "Space Grotesk", sans-serif'; ctx.fillStyle = unlocked ? '#eaf1ff' : '#9aa0ac';
  ctx.fillText(g.short || g.label, cx, py + ph - 26);
  ctx.font = '10.5px "Space Grotesk", sans-serif'; ctx.fillStyle = unlocked ? `rgba(${col},1)` : '#8a8f9c';
  ctx.fillText(done ? '클리어 완료' : unlocked ? '입장하기 ▸' : '곧 열려요', cx, py + ph - 9);
}

function cloud(ctx, x, y) {
  ctx.beginPath(); ctx.arc(x, y, 20, 0, 6.283); ctx.arc(x + 22, y + 4, 26, 0, 6.283); ctx.arc(x + 50, y, 18, 0, 6.283);
  ctx.rect(x - 4, y, 56, 18); ctx.fill();
}
function bunting(ctx, MAP_W, t) {
  const cols = ['#ff6b6b', '#ffd24a', '#5ad17a', '#6fb7ff', '#b18bff'];
  ctx.strokeStyle = 'rgba(120,90,60,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); for (let x = 0; x <= MAP_W; x += 6) ctx.lineTo(x, 200 + Math.sin(x / 60) * 6); ctx.stroke();
  for (let i = 0, x = 18; x < MAP_W; x += 40, i++) {
    const yy = 206 + Math.sin(x / 60) * 6;
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath(); ctx.moveTo(x - 10, yy); ctx.lineTo(x + 10, yy); ctx.lineTo(x, yy + 18); ctx.closePath(); ctx.fill();
  }
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
