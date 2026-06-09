// chapter.js — 무대 안(부스 목록). 부스로 입장해 미니게임을 클리어하면 ✓, 모두 클리어하면 다음 무대 개방.
// 밝은 미니게임천국 톤: 따뜻한 부스 내부(스테이지별 배경 슬롯) + 글로시 스톨 카드(메달 컬러).

import { createWorld } from '../engine/topdown.js';
import { mountSay, eddieRandom } from '../app/eddieSay.js';
import { mountCurriculumHeader } from '../app/curriculumHeader.js';
import { getChapter, chapterRooms, isRoomCleared } from '../content/curriculum.js';

const CARD_W = 152, CARD_H = 104, COL_W = 210, ROW_H = 196, MARGIN = 90, TOP = 150;
const PAL = [['255,200,74', '255,170,40'], ['255,122,184', '233,80,150'], ['90,201,255', '40,160,235'], ['155,140,255', '120,100,235'], ['120,220,150', '60,185,110']];

// 스테이지별 배경(있으면 사용): /brand/stage-{chapterId}-bg.png
const STAGE_IMG = {};
function stageImg(id) { if (!STAGE_IMG[id]) { const im = new Image(); im.src = `/brand/stage-${id}-bg.png`; STAGE_IMG[id] = im; } return STAGE_IMG[id]; }

export function showChapter(root, { chapter, onRoom, onExit, onChapter, spawnAt } = {}) {
  const ch = getChapter(chapter);
  const rooms = chapterRooms(chapter);
  const cols = rooms.length <= 3 ? rooms.length : rooms.length <= 8 ? 4 : 5;
  const rowsN = Math.ceil(rooms.length / cols);
  const MAP_W = Math.max(560, MARGIN * 2 + cols * COL_W);
  const MAP_H = TOP + rowsN * ROW_H + 150;

  const cells = rooms.map((r, i) => {
    const col = i % cols, row = (i / cols) | 0;
    const x = MARGIN + col * COL_W + (COL_W - CARD_W) / 2;
    const y = TOP + row * ROW_H;
    return { ...r, idx: i, cx: x, cy: y };
  });
  const EXIT = { x: MAP_W / 2 - 34, y: MAP_H - 58, w: 68, h: 40 };

  const firstReady = cells.find((c) => c.status === 'ready') || cells[0];
  let spawnPt = firstReady
    ? { x: firstReady.cx + CARD_W / 2 - 14, y: firstReady.cy + CARD_H + 12 }
    : { x: MAP_W / 2 - 14, y: MAP_H - 100 };
  if (spawnAt) { const c = cells.find((x) => x.id === spawnAt); if (c) spawnPt = { x: c.cx + CARD_W / 2 - 14, y: c.cy + CARD_H + 12 }; }

  root.innerHTML = `
    <div class="scene game-scene scene-fade escape-scene">
      <div class="world-host" id="world-host"></div>
      <div class="hud-hint" id="hud-hint"></div>
      <div class="hud-toast" id="hud-toast"></div>
      <div class="hud-narrate" id="hud-narrate"></div>
      <div class="hud-controls">⬆⬇⬅➡ 이동 · Space 입장 · 🎪 광장으로 · EDDIE 클릭</div>
    </div>`;

  const header = mountCurriculumHeader(root.querySelector('.escape-scene'), {
    active: chapter, crumb: `${ch.short} · ${ch.act}`,
    onChapter: (id) => { if (id !== chapter) { destroyAll(); (onChapter || (() => onExit?.()))(id); } },
  });

  const hintEl = root.querySelector('#hud-hint');
  const toastEl = root.querySelector('#hud-toast');
  const narrateEl = root.querySelector('#hud-narrate');
  const say = mountSay(root.querySelector('.game-scene'));

  const map = {
    width: MAP_W, height: MAP_H, bg: '#e7dcc4',
    spawn: spawnPt,
    walls: [
      { x: 0, y: 0, w: MAP_W, h: 24 }, { x: 0, y: MAP_H - 24, w: MAP_W, h: 24 },
      { x: 0, y: 0, w: 24, h: MAP_H }, { x: MAP_W - 24, y: 0, w: 24, h: MAP_H },
      ...cells.map((c) => ({ x: c.cx, y: c.cy, w: CARD_W, h: CARD_H })),
    ],
    triggers: [
      ...cells.map((c) => ({ id: c.id, x: c.cx, y: c.cy + CARD_H, w: CARD_W, h: 48 })),
      { id: '__exit', ...EXIT },
    ],
    draw: (ctx, st) => drawChapter(ctx, st, cells, MAP_W, MAP_H, EXIT, ch),
  };

  const world = createWorld(root.querySelector('#world-host'), map, {
    onInteract: handle,
    onFrame: updateHint,
    onEddieClick: (x, y) => say(eddieRandom(), x, y),
    onDrawOverlay: drawVignette,
  });

  setTimeout(() => narrate(`${ch.short}에 입장! ${ch.act} — 부스마다 미니게임을 클리어해 메달을 모으자! 🎖️`), 500);

  function destroyAll() { try { world.destroy(); } catch (_) {} header.destroy(); }

  function handle(id) {
    if (id === '__exit') { destroyAll(); onExit?.(); return; }
    const r = cells.find((c) => c.id === id); if (!r) return;
    if (r.status !== 'ready') { soonModal(r); return; }
    if (isRoomCleared(r.id)) { world.pause(); confirmReenter(r, () => { destroyAll(); onRoom?.(id); }, () => world.resume()); return; }
    destroyAll(); onRoom?.(id);
  }

  function confirmReenter(r, yes, no) {
    const m = document.createElement('div'); m.className = 'modal-backdrop';
    m.innerHTML = `<div class="modal"><h3>✅ ${r.icon} ${r.name} — 클리어한 부스</h3>
      <p>이미 메달을 받은 부스예요. <b>다시 플레이할까요?</b></p>
      <div class="modal-actions"><button class="btn" id="re-no">아니오</button><button class="btn primary" id="re-yes">예, 다시 ▶</button></div></div>`;
    document.body.appendChild(m);
    m.querySelector('#re-no').onclick = () => { m.remove(); no(); };
    m.querySelector('#re-yes').onclick = () => { m.remove(); yes(); };
  }

  function soonModal(r) {
    world.pause();
    const m = document.createElement('div'); m.className = 'modal-backdrop';
    m.innerHTML = `<div class="modal"><h3>${r.icon} ${r.name} · ${r.mission}</h3>
      <p><b>준비중인 부스</b>예요. 곧 미니게임으로 만나요!<br/>
      <span class="muted">개념: ${r.concept} · 보상: ${r.reward}</span></p>
      <div class="modal-actions"><button class="btn primary" id="soon-ok">알겠어요 ▶</button></div></div>`;
    document.body.appendChild(m);
    m.querySelector('#soon-ok').onclick = () => { m.remove(); world.resume(); };
  }

  function updateHint(state) {
    const tr = state.activeTrigger;
    if (!tr) { hintEl.classList.remove('show'); return; }
    if (tr.id === '__exit') { hintEl.innerHTML = '🎪 Space · 광장으로 나가기'; hintEl.classList.add('show'); return; }
    const r = cells.find((c) => c.id === tr.id); if (!r) { hintEl.classList.remove('show'); return; }
    const clr = isRoomCleared(r.id);
    hintEl.innerHTML = r.status === 'ready'
      ? (clr ? `${r.icon} ${r.name} · 클리어 ✓ (다시 플레이)` : `▶ Space · <b>${r.icon} ${r.name}</b> — ${r.mission}`)
      : `🔒 ${r.icon} ${r.name} (준비중)`;
    hintEl.classList.add('show');
  }

  let tT = null, nT = null;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => toastEl.classList.remove('show'), 2400); }
  function narrate(t) { narrateEl.innerHTML = `<span>🤖 ${t}</span>`; narrateEl.classList.add('show'); clearTimeout(nT); nT = setTimeout(() => narrateEl.classList.remove('show'), 5000); }

  // 밝은 톤: 은은한 따뜻한 비네트만
  function drawVignette(ctx, st, canvas) {
    const g = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.46, canvas.height * 0.42, canvas.width / 2, canvas.height / 2, canvas.height * 1.02);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,30,10,0.22)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawCover(ctx, img, W, H) {
  const ir = img.naturalWidth / img.naturalHeight, r = W / H;
  let dw, dh; if (ir > r) { dh = H; dw = H * ir; } else { dw = W; dh = W / ir; }
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

function drawChapter(ctx, st, cells, MAP_W, MAP_H, EXIT, ch) {
  const t = st?.t || 0;
  const img = stageImg(ch.id);
  if (img.complete && img.naturalWidth) {
    drawCover(ctx, img, MAP_W, MAP_H);
  } else {
    // 따뜻한 부스 내부(폴백): 위쪽 천막 줄무늬 띠 + 나무 바닥
    const top = ctx.createLinearGradient(0, 0, 0, 150); top.addColorStop(0, '#f3e6d2'); top.addColorStop(1, '#e9d2bf');
    ctx.fillStyle = top; ctx.fillRect(0, 0, MAP_W, 150);
    ctx.fillStyle = 'rgba(220,120,120,0.16)';
    for (let x = 0; x < MAP_W; x += 64) ctx.fillRect(x, 0, 32, 150);
    const fl = ctx.createLinearGradient(0, 150, 0, MAP_H); fl.addColorStop(0, '#e7cfa6'); fl.addColorStop(1, '#d8b889');
    ctx.fillStyle = fl; ctx.fillRect(0, 150, MAP_W, MAP_H - 150);
    ctx.strokeStyle = 'rgba(120,90,50,0.18)'; ctx.lineWidth = 2;
    for (let y = 188; y < MAP_H; y += 46) { ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(MAP_W - 24, y); ctx.stroke(); }
  }

  ctx.textAlign = 'center';
  for (const c of cells) drawStall(ctx, c, t);

  // 나가기(광장으로)
  ctx.save();
  ctx.fillStyle = 'rgba(20,26,44,0.9)'; rr(ctx, EXIT.x - 10, EXIT.y, EXIT.w + 20, 28, 9); ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,120,0.85)'; ctx.lineWidth = 2; rr(ctx, EXIT.x - 10, EXIT.y, EXIT.w + 20, 28, 9); ctx.stroke();
  ctx.fillStyle = '#ffe6b0'; ctx.font = '800 12px "Space Grotesk", sans-serif'; ctx.fillText('🎪 광장으로', EXIT.x + EXIT.w / 2, EXIT.y + 18);
  ctx.restore();
  ctx.textAlign = 'start';
}

// 밝은 글로시 스톨 카드(메달 컬러)
function drawStall(ctx, c, t) {
  const ready = c.status === 'ready', clr = isRoomCleared(c.id);
  const [c1, c2] = clr ? ['255,205,80', '245,170,40'] : ready ? PAL[c.idx % PAL.length] : ['175,180,190', '135,140,150'];
  const fx = c.cx, fy = c.cy, fw = CARD_W, fh = CARD_H, cx = fx + fw / 2;

  // 바닥 풋라이트 + 접지 그림자
  if (ready || clr) {
    const fg = ctx.createRadialGradient(cx, fy + fh + 14, 4, cx, fy + fh + 14, 76);
    fg.addColorStop(0, `rgba(${c1},0.32)`); fg.addColorStop(1, `rgba(${c1},0)`);
    ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(cx, fy + fh + 14, 70, 18, 0, 0, 6.283); ctx.fill();
  }
  ctx.fillStyle = 'rgba(60,40,20,0.18)'; ctx.beginPath(); ctx.ellipse(cx, fy + fh + 12, 56, 9, 0, 0, 6.283); ctx.fill();

  // 카드 패널(밝은 글래스)
  ctx.save();
  ctx.shadowColor = 'rgba(40,24,10,0.3)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 8;
  const pf = ctx.createLinearGradient(fx, fy, fx, fy + fh);
  pf.addColorStop(0, 'rgba(255,255,255,0.97)'); pf.addColorStop(1, 'rgba(248,243,235,0.97)');
  ctx.fillStyle = pf; rr(ctx, fx, fy, fw, fh, 14); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = `rgba(${c1},0.95)`; ctx.lineWidth = 2.5; rr(ctx, fx, fy, fw, fh, 14); ctx.stroke();

  // 상단 컬러 차양(awning)
  ctx.fillStyle = `rgba(${c2},0.95)`; rr(ctx, fx + 6, fy + 6, fw - 12, 22, 8); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let x = fx + 10; x < fx + fw - 12; x += 20) ctx.fillRect(x, fy + 6, 10, 22);

  // 아이콘
  ctx.font = '30px sans-serif'; ctx.fillStyle = ready || clr ? '#1a1f2e' : '#8a8f9c';
  ctx.fillText(clr ? '✅' : ready ? c.icon : '🔒', cx, fy + 64);

  // 이름 + 상태
  ctx.font = '800 12.5px "Space Grotesk", sans-serif'; ctx.fillStyle = '#23283a';
  ctx.fillText(c.name, cx, fy + fh - 22);
  if (clr) { ctx.font = '10px "Space Grotesk", sans-serif'; ctx.fillStyle = 'rgba(210,150,20,1)'; ctx.fillText('클리어 ✓', cx, fy + fh - 8); }
  else if (ready) { ctx.font = '10px "Space Grotesk", sans-serif'; ctx.fillStyle = `rgba(${c2},1)`; ctx.fillText('▶ 입장하기', cx, fy + fh - 8); }
  else { ctx.font = '700 10px "Space Grotesk", sans-serif'; ctx.fillStyle = 'rgba(150,120,60,0.95)'; ctx.fillText('준비중 · 곧 공개', cx, fy + fh - 8); }

  // PLAY 핀(플레이 가능 + 미클리어): 살짝 둥실
  if (ready && !clr) {
    const py = fy - 12 + Math.sin(t * 0.14 + c.idx) * 2;
    ctx.fillStyle = `rgb(${c1})`; rr(ctx, fx + fw - 46, py, 40, 18, 9); ctx.fill();
    ctx.fillStyle = '#2a1500'; ctx.font = '800 9.5px "Space Grotesk", sans-serif'; ctx.fillText('PLAY', fx + fw - 26, py + 12);
  }
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
