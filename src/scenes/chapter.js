// chapter.js — 챕터 입구 안. 하위 미션 방(문)들이 보인다. 문으로 입장해 미션을 풀면
// 그 방이 환해지고 ✓. 모든 방을 풀면 다음 챕터가 열린다. 어둠/비상등 = 탈출 분위기.

import { createWorld } from '../engine/topdown.js';
import { mountSay, eddieRandom } from '../app/eddieSay.js';
import { mountCurriculumHeader } from '../app/curriculumHeader.js';
import { getChapter, chapterRooms, isRoomCleared } from '../content/curriculum.js';

const CARD_W = 152, CARD_H = 104, COL_W = 210, ROW_H = 196, MARGIN = 90, TOP = 150;

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
    return { ...r, cx: x, cy: y };
  });
  const EXIT = { x: MAP_W / 2 - 34, y: MAP_H - 58, w: 68, h: 40 };

  // 기본 스폰: 첫 번째 '플레이 가능' 방 바로 앞(바로 입장할 수 있게)
  const firstReady = cells.find((c) => c.status === 'ready') || cells[0];
  let spawnPt = firstReady
    ? { x: firstReady.cx + CARD_W / 2 - 14, y: firstReady.cy + CARD_H + 58 }
    : { x: MAP_W / 2 - 14, y: MAP_H - 100 };
  if (spawnAt) { const c = cells.find((x) => x.id === spawnAt); if (c) spawnPt = { x: c.cx + CARD_W / 2 - 14, y: c.cy + CARD_H + 56 }; }

  root.innerHTML = `
    <div class="scene game-scene scene-fade escape-scene">
      <div class="world-host" id="world-host"></div>
      <div class="hud-hint" id="hud-hint"></div>
      <div class="hud-toast" id="hud-toast"></div>
      <div class="hud-narrate" id="hud-narrate"></div>
      <div class="hud-controls">⬆⬇⬅➡ 이동 · Space 입장 · 🚪 복도로 · EDDIE 클릭</div>
    </div>`;

  const header = mountCurriculumHeader(root.querySelector('.escape-scene'), {
    active: chapter, crumb: `${ch.short} · ${ch.act}`,
    onChapter: (id) => { if (id !== chapter) { destroyAll(); (onChapter || (() => onExit?.()))(id); } },
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
      { x: 0, y: 0, w: MAP_W, h: 24 }, { x: 0, y: MAP_H - 24, w: MAP_W, h: 24 },
      { x: 0, y: 0, w: 24, h: MAP_H }, { x: MAP_W - 24, y: 0, w: 24, h: MAP_H },
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
    onDrawOverlay: drawDark,
  });

  setTimeout(() => narrate(`${ch.short} 구역. ${ch.act} — 방마다의 미션을 풀어 복구하자!`), 500);

  function destroyAll() { try { world.destroy(); } catch (_) {} header.destroy(); }

  function handle(id) {
    if (id === '__exit') { destroyAll(); onExit?.(); return; }
    const r = cells.find((c) => c.id === id); if (!r) return;
    if (r.status !== 'ready') { soonModal(r); return; }
    destroyAll(); onRoom?.(id);
  }

  function soonModal(r) {
    world.pause();
    const m = document.createElement('div'); m.className = 'modal-backdrop';
    m.innerHTML = `<div class="modal"><h3>${r.icon} ${r.name} · ${r.escape}</h3>
      <p><b>준비중인 방</b>이에요. 곧 미니게임으로 만나요!<br/>
      <span class="muted">개념: ${r.concept} · 보상: ${r.reward}</span></p>
      <div class="modal-actions"><button class="btn primary" id="soon-ok">알겠어요 ▶</button></div></div>`;
    document.body.appendChild(m);
    m.querySelector('#soon-ok').onclick = () => { m.remove(); world.resume(); };
  }

  function updateHint(state) {
    const tr = state.activeTrigger;
    if (!tr) { hintEl.classList.remove('show'); return; }
    if (tr.id === '__exit') { hintEl.innerHTML = '🚪 Space · 복도로 나가기'; hintEl.classList.add('show'); return; }
    const r = cells.find((c) => c.id === tr.id); if (!r) { hintEl.classList.remove('show'); return; }
    const clr = isRoomCleared(r.id);
    hintEl.innerHTML = r.status === 'ready'
      ? (clr ? `${r.icon} ${r.name} · 클리어됨 ✓ (다시 학습)` : `▶ Space · <b>${r.icon} ${r.name}</b> — ${r.escape}`)
      : `🔒 ${r.icon} ${r.name} (준비중)`;
    hintEl.classList.add('show');
  }

  let tT = null, nT = null;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => toastEl.classList.remove('show'), 2400); }
  function narrate(t) { narrateEl.innerHTML = `<span>🤖 ${t}</span>`; narrateEl.classList.add('show'); clearTimeout(nT); nT = setTimeout(() => narrateEl.classList.remove('show'), 5000); }

  function drawDark(ctx, st, canvas) {
    if (dark.width !== canvas.width || dark.height !== canvas.height) { dark.width = canvas.width; dark.height = canvas.height; }
    const cam = st.cam, p = st.player;
    dctx.clearRect(0, 0, dark.width, dark.height);
    dctx.fillStyle = 'rgba(2,4,10,0.84)'; dctx.fillRect(0, 0, dark.width, dark.height);
    dctx.globalCompositeOperation = 'destination-out';
    hole(dctx, p.x + p.w / 2 - cam.x, p.y + p.h / 2 - cam.y, 175);
    for (const c of cells) { if (isRoomCleared(c.id)) hole(dctx, c.cx + CARD_W / 2 - cam.x, c.cy + CARD_H / 2 - cam.y, 165); }
    dctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(dark, 0, 0);
  }
}

function hole(c, x, y, r) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.62, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}

function drawChapter(ctx, st, cells, MAP_W, MAP_H, EXIT, ch) {
  // 바닥(콘크리트)
  const fg = ctx.createLinearGradient(0, 0, 0, MAP_H); fg.addColorStop(0, '#101626'); fg.addColorStop(1, '#080b14');
  ctx.fillStyle = fg; ctx.fillRect(0, 0, MAP_W, MAP_H);
  ctx.strokeStyle = 'rgba(120,150,210,0.05)'; ctx.lineWidth = 1;
  for (let x = 24; x < MAP_W; x += 52) { ctx.beginPath(); ctx.moveTo(x, 24); ctx.lineTo(x, MAP_H - 24); ctx.stroke(); }
  for (let y = 24; y < MAP_H; y += 52) { ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(MAP_W - 24, y); ctx.stroke(); }
  // 벽
  ctx.fillStyle = '#0c111d'; ctx.fillRect(0, 0, MAP_W, 24); ctx.fillRect(0, MAP_H - 24, MAP_W, 24); ctx.fillRect(0, 0, 24, MAP_H); ctx.fillRect(MAP_W - 24, 0, 24, MAP_H);
  ctx.fillStyle = 'rgba(90,120,180,0.12)'; ctx.fillRect(24, 22, MAP_W - 48, 2);

  ctx.textAlign = 'center';
  for (const c of cells) {
    const ready = c.status === 'ready', clr = isRoomCleared(c.id);
    const accent = clr ? '61,220,145' : ready ? '111,183,255' : '120,90,90';
    const fx = c.cx, fy = c.cy, fw = CARD_W, fh = CARD_H;
    if (ready || clr) { const lg = ctx.createRadialGradient(fx + fw / 2, fy + fh / 2, 6, fx + fw / 2, fy + fh / 2, 96); lg.addColorStop(0, `rgba(${accent},0.26)`); lg.addColorStop(1, `rgba(${accent},0)`); ctx.fillStyle = lg; ctx.fillRect(fx - 28, fy - 28, fw + 56, fh + 56); }
    const ff = ctx.createLinearGradient(fx, fy, fx, fy + fh); ff.addColorStop(0, ready ? '#26324f' : '#1c1822'); ff.addColorStop(1, ready ? '#161f36' : '#141018');
    ctx.fillStyle = ff; rr(ctx, fx, fy, fw, fh, 12); ctx.fill();
    ctx.strokeStyle = `rgba(${accent},${ready ? 0.9 : 0.5})`; ctx.lineWidth = 2; rr(ctx, fx, fy, fw, fh, 12); ctx.stroke();
    // 내부 통로
    const gg = ctx.createLinearGradient(0, fy + 12, 0, fy + fh - 12); gg.addColorStop(0, 'rgba(6,10,18,0.92)'); gg.addColorStop(1, clr ? 'rgba(61,220,145,0.16)' : ready ? 'rgba(111,183,255,0.12)' : 'rgba(8,8,14,0.92)');
    ctx.fillStyle = gg; rr(ctx, fx + 10, fy + 10, fw - 20, fh - 38, 8); ctx.fill();
    ctx.font = '30px sans-serif'; ctx.fillStyle = ready ? '#fff' : '#6a4a4a';
    ctx.fillText(clr ? '✓' : ready ? c.icon : '🔒', fx + fw / 2, fy + 42);
    // 이름 + 상태/탈출 상황
    ctx.font = '700 12px "Space Grotesk", sans-serif'; ctx.fillStyle = clr ? '#bfffd9' : ready ? '#dce8ff' : '#9a8088';
    ctx.fillText(c.name, fx + fw / 2, fy + fh - 22);
    if (clr) { ctx.font = '10px "Space Grotesk", sans-serif'; ctx.fillStyle = 'rgba(120,230,170,0.7)'; ctx.fillText('복구 완료 ✓', fx + fw / 2, fy + fh - 8); }
    else if (ready) { ctx.font = '10px "Space Grotesk", sans-serif'; ctx.fillStyle = 'rgba(180,200,255,0.6)'; ctx.fillText(`▶ ${c.escape}`, fx + fw / 2, fy + fh - 8); }
    else { ctx.font = '700 10px "Space Grotesk", sans-serif'; ctx.fillStyle = 'rgba(255,176,32,0.6)'; ctx.fillText('준비중 · 곧 공개', fx + fw / 2, fy + fh - 8); }
    // 플레이 가능 방엔 'PLAY' 핀(눈에 띄게)
    if (ready && !clr) { ctx.fillStyle = 'rgba(111,183,255,0.9)'; rr(ctx, fx + fw - 44, fy + 8, 36, 16, 8); ctx.fill(); ctx.fillStyle = '#06121f'; ctx.font = '700 9px "Space Grotesk", sans-serif'; ctx.fillText('PLAY', fx + fw - 26, fy + 19); }
  }

  // 나가기(복도로)
  ctx.fillStyle = '#2c3c68'; rr(ctx, EXIT.x - 6, EXIT.y, EXIT.w + 12, 26, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(111,183,255,0.6)'; ctx.lineWidth = 1.5; rr(ctx, EXIT.x - 6, EXIT.y, EXIT.w + 12, 26, 8); ctx.stroke();
  ctx.fillStyle = '#cfe0ff'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('🚪 복도로', EXIT.x + EXIT.w / 2, EXIT.y + 17);
  ctx.textAlign = 'start';
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
