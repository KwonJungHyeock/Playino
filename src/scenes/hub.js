// hub.js — Eduino AI : 미니게임천국 · 미니게임 광장(HUB).
// 일러스트 카니발 배경(/brand/hub-bg.png) 위를 EDDIE가 걸어다니며 스테이지(챕터)를 고른다.
// 진입 UI는 무대 위 패널이 아니라 "광장 바닥에 세운 입간판(signpost)" 으로 — 배경 무대와 겹치지 않게.
// 잠긴 스테이지는 직전 스테이지를 모두 통과해야 열린다.

import { createWorld } from '../engine/topdown.js';
import { mountSay, eddieRandom } from '../app/eddieSay.js';
import { mountCurriculumHeader } from '../app/curriculumHeader.js';
import { CHAPTERS, getChapter, chapterDone, chapterUnlocked, chapterClearedCount, chapterTotal } from '../content/curriculum.js';

// 월드 크기는 일러스트 비율(≈2.3:1)에 맞춰 — drawCover 크롭 최소화
const MAP_W = 1280, MAP_H = 560;
// 입간판 가로 위치(광장 폭의 비율). 무대가 아니라 가운데 빈 바닥에 고르게 세운다.
const SIGN_FX = [0.22, 0.41, 0.59, 0.78];
const SIGN_GY = MAP_H * 0.64;        // 바닥(풋라이트) y — 걷는 영역 안
const SIGN_W = 158;                  // 트리거 폭

export function showHub(root, { onEnter, spawnAt } = {}) {
  const gates = CHAPTERS.map((c, i) => ({ ...c, gx: MAP_W * SIGN_FX[i], gy: SIGN_GY }));

  let spawnPt = { x: MAP_W * 0.5 - 14, y: MAP_H * 0.78 };
  if (spawnAt) { const g = gates.find((x) => x.id === spawnAt); if (g) spawnPt = { x: g.gx - 14, y: g.gy + 46 }; }

  root.innerHTML = `
    <div class="scene game-scene scene-fade escape-scene">
      <div class="world-host" id="world-host"></div>
      <div class="hud-hint" id="hud-hint"></div>
      <div class="hud-toast" id="hud-toast"></div>
      <div class="hud-narrate" id="hud-narrate"></div>
      <div class="hud-controls">⬅➡⬆⬇ 이동 · Space 입장 · EDDIE 클릭 · 상단에서 챕터 이동</div>
    </div>`;

  const header = mountCurriculumHeader(root.querySelector('.escape-scene'), {
    active: null, crumb: '미니게임 광장',
    onChapter: (id) => tryEnter(id),
  });

  const hintEl = root.querySelector('#hud-hint');
  const toastEl = root.querySelector('#hud-toast');
  const narrateEl = root.querySelector('#hud-narrate');
  const say = mountSay(root.querySelector('.game-scene'));

  const map = {
    width: MAP_W, height: MAP_H, bg: '#bfe3ff',
    spawn: spawnPt,
    walls: [
      { x: 0, y: 0, w: MAP_W, h: MAP_H * 0.46 },               // 위쪽 무대/하늘(배경) — 진입 불가
      { x: 0, y: MAP_H * 0.92, w: MAP_W, h: MAP_H * 0.08 },     // 아래 가랜드/울타리
      { x: 0, y: 0, w: 16, h: MAP_H }, { x: MAP_W - 16, y: 0, w: 16, h: MAP_H },
    ],
    // 트리거는 입간판 발치(풋라이트)에 둔다 → EDDIE가 다가오면 Space
    triggers: gates.map((g) => ({ id: g.id, x: g.gx - SIGN_W / 2, y: g.gy - 26, w: SIGN_W, h: 58 })),
    draw: (ctx, st) => drawHub(ctx, st, gates),
  };

  const world = createWorld(root.querySelector('#world-host'), map, {
    onInteract: tryEnter,
    onFrame: updateHint,
    onEddieClick: (x, y) => say(eddieRandom(), x, y),
    onDrawOverlay: drawVignette,
  });

  setTimeout(() => narrate('미니게임천국에 온 걸 환영해! 🎉 입간판으로 걸어가서 Space로 스테이지에 입장하자!'), 500);

  function tryEnter(id) {
    const c = getChapter(id); if (!c) return;
    if (!chapterUnlocked(id)) { toast(`🔒 ${c.short} — 이전 스테이지를 먼저 통과해야 열려요`); return; }
    world.destroy(); header.destroy(); onEnter?.(id);
  }

  function updateHint(state) {
    const tr = state.activeTrigger;
    if (!tr) { hintEl.classList.remove('show'); return; }
    const c = getChapter(tr.id); if (!c) { hintEl.classList.remove('show'); return; }
    const unlocked = chapterUnlocked(c.id), done = chapterDone(c.id);
    hintEl.innerHTML = unlocked
      ? `▶ Space · <b>${c.label}</b> 입장 ${done ? '✓' : `(${chapterClearedCount(c.id)}/${chapterTotal(c.id)})`}`
      : `🔒 ${c.label} (이전 스테이지 먼저)`;
    hintEl.classList.add('show');
  }

  let tT = null, nT = null;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => toastEl.classList.remove('show'), 2400); }
  function narrate(t) { narrateEl.innerHTML = `<span>🤖 ${t}</span>`; narrateEl.classList.add('show'); clearTimeout(nT); nT = setTimeout(() => narrateEl.classList.remove('show'), 5200); }

  // 밝은 톤: 은은한 비네트만(호러 어둠 없음)
  function drawVignette(ctx, st, canvas) {
    const g = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.46, canvas.height * 0.42, canvas.width / 2, canvas.height / 2, canvas.height * 0.98);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,10,40,0.16)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

const hubImg = new Image(); hubImg.src = '/brand/hub-bg.png';   // 일러스트 광장(있으면 사용)
const PAL = ['255,200,74', '255,122,184', '90,201,255', '155,140,255'];   // 스테이지별 캔디 컬러

function drawCover(ctx, img, W, H) {
  const ir = img.naturalWidth / img.naturalHeight, r = W / H;
  let dw, dh; if (ir > r) { dh = H; dw = H * ir; } else { dw = W; dh = W / ir; }
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

function drawHub(ctx, st, gates) {
  const t = st?.t || 0;
  const activeId = st?.activeTrigger?.id || null;
  if (hubImg.complete && hubImg.naturalWidth) {
    drawCover(ctx, hubImg, MAP_W, MAP_H);                       // 일러스트 광장
  } else {
    // 절차적 광장(폴백)
    const sky = ctx.createLinearGradient(0, 0, 0, 220); sky.addColorStop(0, '#bfe6ff'); sky.addColorStop(1, '#ffe6f1');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, MAP_W, 220);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < MAP_W / 320 + 1; i++) cloud(ctx, 120 + i * 320 + (t * 0.15) % 320, 60 + (i % 2) * 26);
    const fl = ctx.createLinearGradient(0, 220, 0, MAP_H); fl.addColorStop(0, '#ffe7bd'); fl.addColorStop(1, '#f1c98c');
    ctx.fillStyle = fl; ctx.fillRect(0, 220, MAP_W, MAP_H - 220);
    bunting(ctx, t);
  }
  // 입간판은 y(발치) 기준으로 정렬해 뒤→앞 순서로 그린다
  const order = gates.map((g, i) => ({ g, i })).sort((a, b) => a.g.gy - b.g.gy);
  for (const { g, i } of order) drawSignpost(ctx, g, i, g.id === activeId, t);
  ctx.textAlign = 'start';
}

// 광장 바닥에 세운 입간판: 풋라이트(바닥 글로우) + 기둥 + 사인 보드
function drawSignpost(ctx, g, i, active, t) {
  const cx = g.gx, gy = g.gy;                 // gy = 바닥 접점
  const unlocked = chapterUnlocked(g.id), done = chapterDone(g.id);
  const col = unlocked ? PAL[i % PAL.length] : '170,174,184';
  const bw = 150, bh = 92;
  const bx = cx - bw / 2, by = gy - 14 - bh;   // 보드 상단 y

  ctx.textAlign = 'center';

  // 바닥 풋라이트
  if (unlocked) {
    const fg = ctx.createRadialGradient(cx, gy, 4, cx, gy, 78);
    fg.addColorStop(0, `rgba(${col},${active ? 0.6 : 0.42})`); fg.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(cx, gy, active ? 72 : 60, active ? 22 : 18, 0, 0, 6.283); ctx.fill();
  }
  // 접지 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(cx, gy + 2, 30, 9, 0, 0, 6.283); ctx.fill();

  // 기둥(보드 → 바닥)
  const stkg = ctx.createLinearGradient(cx - 6, 0, cx + 6, 0);
  stkg.addColorStop(0, '#6f4a2c'); stkg.addColorStop(.5, '#8a5e38'); stkg.addColorStop(1, '#6f4a2c');
  ctx.fillStyle = stkg; ctx.fillRect(cx - 5, by + bh - 6, 10, gy - (by + bh) + 6);

  // 입장 가능 + 가까이: 살짝 띄움(둥실)
  const lift = active && unlocked ? Math.sin(t * 0.12) * 3 : 0;
  const byy = by - lift;

  // 글로우(활성)
  if (active && unlocked) {
    const gl = ctx.createRadialGradient(cx, byy + bh / 2, 8, cx, byy + bh / 2, 110);
    gl.addColorStop(0, `rgba(${col},0.34)`); gl.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = gl; ctx.fillRect(bx - 40, byy - 26, bw + 80, bh + 60);
  }

  // 보드 패널
  const pf = ctx.createLinearGradient(bx, byy, bx, byy + bh);
  pf.addColorStop(0, 'rgba(20,26,44,0.92)'); pf.addColorStop(1, 'rgba(11,15,26,0.94)');
  ctx.fillStyle = pf; rr(ctx, bx, byy, bw, bh, 14); ctx.fill();
  ctx.strokeStyle = `rgba(${col},${unlocked ? 0.95 : 0.5})`; ctx.lineWidth = 2.5; rr(ctx, bx, byy, bw, bh, 14); ctx.stroke();

  // STAGE n 바
  ctx.fillStyle = `rgba(${col},${unlocked ? 0.95 : 0.5})`; rr(ctx, bx + 9, byy + 8, bw - 18, 22, 7); ctx.fill();
  ctx.fillStyle = unlocked ? '#10131f' : '#33363f'; ctx.font = '800 11.5px "Space Grotesk", sans-serif';
  ctx.fillText(`STAGE ${g.no}${done ? ' ✓' : ''}`, cx, byy + 23);

  // 아이콘
  ctx.save(); if (active && unlocked && !done) { ctx.shadowColor = `rgba(${col},0.85)`; ctx.shadowBlur = 14; }
  ctx.font = '34px sans-serif'; ctx.fillStyle = '#fff';
  ctx.fillText(done ? '✅' : unlocked ? g.icon : '🔒', cx, byy + 60); ctx.restore();

  // 라벨 + 상태
  ctx.font = '700 12.5px "Space Grotesk", sans-serif'; ctx.fillStyle = unlocked ? '#eaf1ff' : '#9aa0ac';
  ctx.fillText(g.short || g.label, cx, byy + bh - 18);
  ctx.font = '10px "Space Grotesk", sans-serif'; ctx.fillStyle = unlocked ? `rgba(${col},1)` : '#8a8f9c';
  ctx.fillText(done ? '클리어 완료' : unlocked ? '입장하기 ▸' : '곧 열려요', cx, byy + bh - 5);

  // 활성 시 Space 프롬프트(보드 위 둥실)
  if (active && unlocked) {
    const py = byy - 14 + Math.sin(t * 0.12 + 1) * 2;
    ctx.font = '800 11px "Space Grotesk", sans-serif';
    ctx.fillStyle = `rgba(${col},1)`;
    ctx.fillText('▲ Space', cx, py);
  }
}

function cloud(ctx, x, y) {
  ctx.beginPath(); ctx.arc(x, y, 20, 0, 6.283); ctx.arc(x + 22, y + 4, 26, 0, 6.283); ctx.arc(x + 50, y, 18, 0, 6.283);
  ctx.rect(x - 4, y, 56, 18); ctx.fill();
}
function bunting(ctx, t) {
  const cols = ['#ff6b6b', '#ffd24a', '#5ad17a', '#6fb7ff', '#b18bff'];
  ctx.strokeStyle = 'rgba(120,90,60,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); for (let x = 0; x <= MAP_W; x += 6) ctx.lineTo(x, 220 + Math.sin(x / 60) * 6); ctx.stroke();
  for (let i = 0, x = 18; x < MAP_W; x += 40, i++) {
    const yy = 226 + Math.sin(x / 60) * 6;
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath(); ctx.moveTo(x - 10, yy); ctx.lineTo(x + 10, yy); ctx.lineTo(x, yy + 18); ctx.closePath(); ctx.fill();
  }
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
