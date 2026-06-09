// hub.js — Eduino AI : 미니게임천국 · 미니게임 광장(HUB) = 월드맵 레벨 셀렉트.
// 일러스트 카니발 배경(/brand/hub-bg.png) 위를 EDDIE가 걸어다니며 스테이지(챕터)를 고른다.
// 진입 UI는 무대를 흉내내지 않고 '명백한 게임 UI'(레벨 노드 메달 + 리본 + 점선 길)로 둔다 →
//   정교한 일러스트와 경쟁하지 않고, muted 배경 위에 vibrant 전경으로 또렷이 뜬다.
// 상세(이름·진척·입장)는 하단 HUD 배너로. 잠긴 스테이지는 직전 스테이지를 통과해야 열린다.

import { createWorld } from '../engine/topdown.js';
import { mountSay, eddieRandom } from '../app/eddieSay.js';
import { mountCurriculumHeader } from '../app/curriculumHeader.js';
import { CHAPTERS, getChapter, chapterDone, chapterUnlocked, chapterClearedCount, chapterTotal } from '../content/curriculum.js';

// 월드 크기는 일러스트 비율(≈2.3:1)에 맞춰
const MAP_W = 1280, MAP_H = 560;
// 노드 가로 위치(균등 배치). 새 배경은 이 비율에 무대를 맞춰 제작.
const NODE_FX = [0.155, 0.385, 0.615, 0.845];
const NODE_GY = MAP_H * 0.58;        // 노드 중심 y
const R = 30;                        // 메달 반지름
const TRIG_W = 150;

export function showHub(root, { onEnter, spawnAt } = {}) {
  const gates = CHAPTERS.map((c, i) => ({ ...c, gx: MAP_W * NODE_FX[i], gy: NODE_GY }));

  let spawnPt = { x: MAP_W * 0.5 - 14, y: MAP_H * 0.8 };
  if (spawnAt) { const g = gates.find((x) => x.id === spawnAt); if (g) spawnPt = { x: g.gx - 14, y: g.gy + 70 }; }

  root.innerHTML = `
    <div class="scene game-scene scene-fade escape-scene">
      <div class="world-host" id="world-host"></div>
      <div class="hud-hint" id="hud-hint"></div>
      <div class="hud-toast" id="hud-toast"></div>
      <div class="hub-banner" id="hub-banner"></div>
      <div class="hud-narrate" id="hud-narrate"></div>
      <div class="hud-controls">⬅➡⬆⬇ 이동 · Space 입장 · EDDIE 클릭 · 상단에서 챕터 이동</div>
    </div>`;

  const header = mountCurriculumHeader(root.querySelector('.escape-scene'), {
    active: null, crumb: '미니게임 광장',
    onChapter: (id) => tryEnter(id),
  });

  const hintEl = root.querySelector('#hud-hint');
  const toastEl = root.querySelector('#hud-toast');
  const bannerEl = root.querySelector('#hub-banner');
  const narrateEl = root.querySelector('#hud-narrate');
  const say = mountSay(root.querySelector('.game-scene'));

  const map = {
    width: MAP_W, height: MAP_H, bg: '#e7dcc4',     // 배경 밖 여백 = 따뜻한 크림(파란 여백 제거)
    spawn: spawnPt,
    walls: [
      { x: 0, y: 0, w: MAP_W, h: MAP_H * 0.42 },               // 위쪽 무대/하늘(배경) — 진입 불가
      { x: 0, y: MAP_H * 0.93, w: MAP_W, h: MAP_H * 0.07 },     // 아래 가랜드/울타리
      { x: 0, y: 0, w: 16, h: MAP_H }, { x: MAP_W - 16, y: 0, w: 16, h: MAP_H },
    ],
    triggers: gates.map((g) => ({ id: g.id, x: g.gx - TRIG_W / 2, y: g.gy + 6, w: TRIG_W, h: 64 })),
    draw: (ctx, st) => drawHub(ctx, st, gates),
  };

  const world = createWorld(root.querySelector('#world-host'), map, {
    onInteract: tryEnter,
    onFrame: updateHint,
    onEddieClick: (x, y) => say(eddieRandom(), x, y),
    onDrawOverlay: drawVignette,
  });

  setTimeout(() => narrate('미니게임천국에 온 걸 환영해! 🎉 길을 따라 스테이지로 걸어가 Space로 입장하자!'), 500);

  function tryEnter(id) {
    const c = getChapter(id); if (!c) return;
    if (!chapterUnlocked(id)) { toast(`🔒 ${c.short} — 이전 스테이지를 먼저 통과해야 열려요`); return; }
    world.destroy(); header.destroy(); onEnter?.(id);
  }

  function updateHint(state) {
    const tr = state.activeTrigger;
    if (!tr) { bannerEl.classList.remove('show'); return; }
    const c = getChapter(tr.id); if (!c) { bannerEl.classList.remove('show'); return; }
    const unlocked = chapterUnlocked(c.id), done = chapterDone(c.id);
    const i = CHAPTERS.findIndex((x) => x.id === c.id);
    const accent = ['#ffc84a', '#ff7ab8', '#5ac9ff', '#9b8cff'][i % 4];
    const status = done ? '클리어 완료 ✓' : unlocked ? `진척 ${chapterClearedCount(c.id)} / ${chapterTotal(c.id)}` : '잠김 · 이전 스테이지 먼저';
    bannerEl.innerHTML = `
      <span class="hb-no" style="background:${unlocked ? accent : '#9aa0ac'}">STAGE ${c.no}</span>
      <span class="hb-name">${c.label}</span>
      <span class="hb-status">${status}</span>
      <span class="hb-key">${unlocked ? 'Space 입장 ▸' : '🔒'}</span>`;
    bannerEl.classList.toggle('locked', !unlocked);
    bannerEl.classList.add('show');
  }

  let tT = null, nT = null;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => toastEl.classList.remove('show'), 2400); }
  function narrate(t) { narrateEl.innerHTML = `<span>🤖 ${t}</span>`; narrateEl.classList.add('show'); clearTimeout(nT); nT = setTimeout(() => narrateEl.classList.remove('show'), 5200); }

  // 밝은 톤: 따뜻한 비네트만
  function drawVignette(ctx, st, canvas) {
    const g = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.46, canvas.height * 0.42, canvas.width / 2, canvas.height / 2, canvas.height * 1.02);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,30,10,0.22)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

const hubImg = new Image(); hubImg.src = '/brand/hub-bg.png';
const PAL = [['255,200,74', '255,170,40'], ['255,122,184', '233,80,150'], ['90,201,255', '40,160,235'], ['155,140,255', '120,100,235']];

function drawCover(ctx, img, W, H) {
  const ir = img.naturalWidth / img.naturalHeight, r = W / H;
  let dw, dh; if (ir > r) { dh = H; dw = H * ir; } else { dw = W; dh = W / ir; }
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

function drawHub(ctx, st, gates) {
  const t = st?.t || 0;
  const activeId = st?.activeTrigger?.id || null;
  if (hubImg.complete && hubImg.naturalWidth) {
    drawCover(ctx, hubImg, MAP_W, MAP_H);
  } else {
    const sky = ctx.createLinearGradient(0, 0, 0, 220); sky.addColorStop(0, '#bfe6ff'); sky.addColorStop(1, '#ffe6f1');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, MAP_W, 220);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < MAP_W / 320 + 1; i++) cloud(ctx, 120 + i * 320 + (t * 0.15) % 320, 60 + (i % 2) * 26);
    const fl = ctx.createLinearGradient(0, 220, 0, MAP_H); fl.addColorStop(0, '#ffe7bd'); fl.addColorStop(1, '#f1c98c');
    ctx.fillStyle = fl; ctx.fillRect(0, 220, MAP_W, MAP_H - 220);
    bunting(ctx, t);
  }
  drawPath(ctx, gates, t);                                  // 노드 연결 점선 길
  for (let i = 0; i < gates.length; i++) drawNode(ctx, gates[i], i, gates[i].id === activeId, t);
  ctx.textAlign = 'start';
}

// 노드 사이를 잇는 점선 길(걸어가는 경로 가이드)
function drawPath(ctx, gates, t) {
  ctx.save();
  ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.setLineDash([2, 20]);
  ctx.lineDashOffset = -(t * 0.6) % 22;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  for (let i = 0; i < gates.length; i++) {
    const x = gates[i].gx, y = gates[i].gy + R + 16;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

// 레벨 노드 메달: 바닥 풋라이트 + 글로시 디스크(번호/자물쇠/✓) + 리본 이름표
function drawNode(ctx, g, i, active, t) {
  const cx = g.gx;
  const unlocked = chapterUnlocked(g.id), done = chapterDone(g.id);
  const [c1, c2] = unlocked ? PAL[i % PAL.length] : ['170,176,186', '120,126,138'];
  const bounce = active && unlocked ? Math.abs(Math.sin(t * 0.16)) * 7 : 0;
  const cy = g.gy - bounce;
  const groundY = g.gy + R + 6;

  ctx.textAlign = 'center';

  // 바닥 풋라이트
  if (unlocked) {
    const fg = ctx.createRadialGradient(cx, groundY, 4, cx, groundY, 74);
    fg.addColorStop(0, `rgba(${c1},${active ? 0.55 : 0.36})`); fg.addColorStop(1, `rgba(${c1},0)`);
    ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(cx, groundY, active ? 66 : 54, active ? 20 : 16, 0, 0, 6.283); ctx.fill();
  }
  // 접지 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(cx, groundY, 26, 8, 0, 0, 6.283); ctx.fill();

  // 활성 펄스 링
  if (active && unlocked) {
    const p = (t % 60) / 60;
    ctx.strokeStyle = `rgba(${c1},${(1 - p) * 0.7})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, R + 4 + p * 14, 0, 6.283); ctx.stroke();
  }

  // 메달 디스크
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, R + 4, 0, 6.283); ctx.fill();   // 흰 테두리
  ctx.restore();
  const disc = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
  disc.addColorStop(0, `rgb(${c1})`); disc.addColorStop(1, `rgb(${c2})`);
  ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();
  // 윗부분 광택
  const gloss = ctx.createLinearGradient(cx, cy - R, cx, cy);
  gloss.addColorStop(0, 'rgba(255,255,255,0.55)'); gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss; ctx.beginPath(); ctx.ellipse(cx, cy - R * 0.32, R * 0.74, R * 0.5, 0, 0, 6.283); ctx.fill();

  // 중앙: 번호 / 자물쇠 / 체크
  if (!unlocked) {
    ctx.font = '24px sans-serif'; ctx.fillStyle = '#eef0f4'; ctx.fillText('🔒', cx, cy + 8);
  } else {
    ctx.font = '800 26px "Space Grotesk", sans-serif'; ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 4;
    ctx.fillText(String(g.no), cx, cy + 9); ctx.shadowBlur = 0;
    if (done) {
      ctx.fillStyle = '#3ad07a'; ctx.beginPath(); ctx.arc(cx + R - 4, cy - R + 6, 11, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx + R - 4, cy - R + 6, 11, 0, 6.283); ctx.stroke();
      ctx.font = '700 13px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('✓', cx + R - 4, cy - R + 11);
    }
  }

  // 리본 이름표
  const label = g.short || g.label;
  ctx.font = '700 12px "Space Grotesk", sans-serif';
  const tw = Math.max(64, ctx.measureText(label).width + 22), rw = tw, rh = 22;
  const ry = cy + R + 12, rx = cx - rw / 2;
  ctx.fillStyle = unlocked ? `rgb(${c2})` : 'rgba(130,135,148,0.95)';
  ribbon(ctx, rx, ry, rw, rh);
  ctx.fillStyle = '#fff'; ctx.fillText(label, cx, ry + 15);

  // 활성: Space 안내
  if (active && unlocked) {
    const ky = cy - R - 14 + Math.sin(t * 0.16) * 2;
    ctx.font = '800 12px "Space Grotesk", sans-serif'; ctx.fillStyle = `rgb(${c1})`;
    ctx.fillText('▼ Space', cx, ky);
  }
}

function ribbon(ctx, x, y, w, h) {
  const notch = 7;
  ctx.beginPath();
  ctx.moveTo(x + notch, y); ctx.lineTo(x + w - notch, y);
  ctx.lineTo(x + w, y + h / 2); ctx.lineTo(x + w - notch, y + h);
  ctx.lineTo(x + notch, y + h); ctx.lineTo(x, y + h / 2);
  ctx.closePath(); ctx.fill();
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
