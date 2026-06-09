// sensorRoom.js — 박물관형 센서 전시관(탑다운). EDDIE가 걸어다니며
//   📖 이론대(센서 설명+블록코딩) 와 🎮 체험 게임기 앞에서 Space.
//   밝은 카니발 톤. config 기반이라 센서가 늘면 ROOMS_CFG에 추가만.
import { createWorld } from '../engine/topdown.js';
import { sfx } from '../app/sfx.js';
import { progress } from '../app/progress.js';
import { showLedGame } from './ledGame.js';

const DOOR_W = 264, DOOR_H = 318;   // 입구(문) 크기

const ROOMS_CFG = {
  led: {
    name: '반짝반짝 라이트쇼', sensor: 'LED · 발광 다이오드', icon: '💡', accent: '255,200,74',
    intro: '이론대에서 LED를 배우고, 게임기에서 직접 연주해보자! 🎶',
    theory: [
      { icon: '💡', title: 'LED가 뭐야?', body: '전기가 흐르면 빛나는 작은 전구야. <b>한 방향</b>으로만 전기가 흘러 — <b>긴 다리(＋)</b>, <b>짧은 다리(−)</b>!' },
      { icon: '🔀', title: '디지털 출력으로 켜고 끈다', body: '아두이노가 핀에 <b>HIGH(켜짐)/LOW(꺼짐)</b> 신호를 보내 LED를 제어해. 이게 <b>디지털 출력</b>이야.' },
      { icon: '🚦', title: '어디에 쓰일까?', body: '신호등·전광판·무대 조명이 모두 LED! <b>켜고 끄는 타이밍</b>이 핵심이라 우리 게임도 리듬 게임이야.' },
    ],
    blocks: ['디지털 [2]번 핀 — 켜기 💡', '0.5초 기다리기 ⏱️', '디지털 [2]번 핀 — 끄기 ⚫', '반복하기 🔁'],
    play: (root, opt) => showLedGame(root, opt),
  },
};

export function showSensorRoom(root, { id, onExit } = {}) {
  const cfg = ROOMS_CFG[id]; if (!cfg) { onExit?.(); return; }

  const VW = Math.max(900, window.innerWidth), VH = Math.max(440, window.innerHeight);
  const DW = DOOR_W, DH = DOOR_H;
  const stations = [
    { id: 'theory', icon: '📖', label: '이론관', sub: '센서 배우기 + 블록코딩', cx: VW * 0.32, cy: VH * 0.46 },
    { id: 'play', icon: '🎮', label: '체험관', sub: '미니게임 플레이', cx: VW * 0.68, cy: VH * 0.46 },
  ];
  const EXIT = { x: VW / 2 - 46, y: VH - 72, w: 92, h: 46 };

  root.innerHTML = `
    <div class="scene game-scene scene-fade escape-scene sroom2">
      <div class="world-host" id="world-host"></div>
      <div class="sr-top" id="sr-top"><span class="sr-chip">${cfg.icon}</span> <b>${cfg.name}</b> <span class="sr-sensor">· ${cfg.sensor}</span></div>
      <div class="hud-hint" id="hud-hint"></div>
      <button class="snd-toggle" id="snd-toggle">${sfx.muted ? '🔇' : '🔊'}</button>
      <div class="hud-controls">⬆⬇⬅➡ 이동 · Space 입장 · 🎪 무대로</div>
      <div class="sr-theory-view" id="sr-tview" hidden></div>
    </div>`;

  const host = root.querySelector('#world-host');
  const hintEl = root.querySelector('#hud-hint');
  const snd = root.querySelector('#snd-toggle'); snd.onclick = () => { const m = sfx.toggle(); snd.textContent = m ? '🔇' : '🔊'; };
  const bubble = document.createElement('div'); bubble.className = 'eddie-bubble'; host.appendChild(bubble);
  let bubbleT = null;
  function guide(t, ms = 4200) { bubble.innerHTML = `🤖 ${t}`; bubble.classList.add('show'); clearTimeout(bubbleT); if (ms) bubbleT = setTimeout(() => bubble.classList.remove('show'), ms); }

  const map = {
    width: VW, height: VH, bg: '#efe2c8', playerScale: 1.35,
    spawn: { x: VW / 2 - 14, y: VH * 0.66 },
    walls: [
      { x: 0, y: 0, w: VW, h: VH * 0.16 }, { x: 0, y: VH - 16, w: VW, h: 16 },
      { x: 0, y: 0, w: 16, h: VH }, { x: VW - 16, y: 0, w: 16, h: VH },
      ...stations.map((s) => ({ x: s.cx - DW / 2, y: s.cy - DH / 2, w: DW, h: DH })),
    ],
    triggers: [
      ...stations.map((s) => ({ id: s.id, x: s.cx - DW / 2, y: s.cy + DH / 2, w: DW, h: 56 })),
      { id: '__exit', ...EXIT },
    ],
    draw: (ctx, st) => drawRoom(ctx, st, stations, cfg, VW, VH, EXIT, id),
  };

  const world = createWorld(host, map, {
    onInteract: handle, onFrame: updateHint,
    onEddieClick: () => guide('이론대 먼저? 게임기 먼저? 골라봐! 😎', 2600),
    onDrawOverlay: drawVignette,
  });
  setTimeout(() => guide(cfg.intro), 500);

  function destroyAll() { try { world.destroy(); } catch (_) {} }
  function handle(idTrig) {
    if (idTrig === '__exit') { sfx.pop(); destroyAll(); onExit?.(); return; }
    if (idTrig === 'theory') { sfx.click(); openTheory(); return; }
    if (idTrig === 'play') { sfx.click(); destroyAll(); cfg.play(root, { onExit: () => showSensorRoom(root, { id, onExit }) }); return; }
  }
  function updateHint(state) {
    const p = state.player, cam = state.cam;
    bubble.style.left = ((p.x + p.w / 2) - cam.x) + 'px'; bubble.style.top = (p.y - cam.y - 96) + 'px';
    const tr = state.activeTrigger;
    if (!tr) { hintEl.classList.remove('show'); return; }
    hintEl.innerHTML = tr.id === '__exit' ? '🎪 Space · 무대로' : tr.id === 'theory' ? '📖 Space · 이론 배우기' : '🎮 Space · 게임 체험';
    hintEl.classList.add('show');
  }
  function drawVignette(ctx, st, canvas) {
    const g = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.46, canvas.height * 0.42, canvas.width / 2, canvas.height / 2, canvas.height * 1.02);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,30,10,0.18)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ── 이론대 뷰어(오버레이) ──
  function openTheory() {
    world.pause();
    const v = root.querySelector('#sr-tview'); v.hidden = false;
    let ti = 0; const T = cfg.theory;
    function close() { v.hidden = true; v.innerHTML = ''; world.resume(); }
    function render() {
      if (ti < T.length) {
        const c = T[ti];
        v.innerHTML = `<div class="prep-card sr-tcard">
          <div class="bx-ic" style="font-size:50px">${c.icon}</div>
          <h2>${c.title}</h2><p class="sr-tbody">${c.body}</p>
          <div class="bx-dots">${T.map((_, i) => `<i class="${i === ti ? 'on' : ''}"></i>`).join('')}<i></i></div>
          <div class="sr-tbtns">${ti > 0 ? '<button class="prep-btn" id="t-prev">◀ 이전</button>' : '<button class="prep-btn" id="t-close">닫기</button>'}
          <button class="cel-go" id="t-next">다음 ▶</button></div></div>`;
      } else {
        v.innerHTML = `<div class="prep-card sr-tcard">
          <div class="bx-ic" style="font-size:46px">🧩</div><h2>블록코딩 미리보기</h2>
          <p class="sr-tbody">이렇게 블록을 쌓으면 LED가 깜빡여! 게임기에서 직접 타이밍을 맞춰보자.</p>
          <div class="sr-blocks">${cfg.blocks.map((b, i) => `<div class="sr-block" style="animation-delay:${i * 0.12}s">${b}</div>`).join('')}</div>
          <div class="sr-tbtns"><button class="prep-btn" id="t-prev">◀ 이전</button><button class="cel-go" id="t-close2">알겠어요 ▶</button></div></div>`;
      }
      const prev = v.querySelector('#t-prev'); if (prev) prev.onclick = () => { sfx.hover(); ti--; render(); };
      const next = v.querySelector('#t-next'); if (next) next.onclick = () => { sfx.pop(); ti++; render(); };
      v.querySelector('#t-close')?.addEventListener('click', close);
      v.querySelector('#t-close2')?.addEventListener('click', close);
    }
    render();
  }
}

function drawRoom(ctx, st, stations, cfg, VW, VH, EXIT, id) {
  const t = st?.t || 0, activeId = st?.activeTrigger?.id;
  // 밝은 박물관: 위 따뜻한 벽 + 나무 바닥
  const wall = ctx.createLinearGradient(0, 0, 0, VH * 0.4); wall.addColorStop(0, '#f6ead6'); wall.addColorStop(1, '#ecd8bf');
  ctx.fillStyle = wall; ctx.fillRect(0, 0, VW, VH * 0.4);
  const fl = ctx.createLinearGradient(0, VH * 0.4, 0, VH); fl.addColorStop(0, '#e7cfa6'); fl.addColorStop(1, '#d6b585');
  ctx.fillStyle = fl; ctx.fillRect(0, VH * 0.4, VW, VH * 0.6);
  ctx.strokeStyle = 'rgba(120,90,50,0.16)'; ctx.lineWidth = 2;
  for (let y = VH * 0.45; y < VH; y += 48) { ctx.beginPath(); ctx.moveTo(16, y); ctx.lineTo(VW - 16, y); ctx.stroke(); }
  bunting(ctx, VW, t);

  for (const s of stations) drawStation(ctx, s, s.id === activeId, t, cfg);

  // 무대로 출구
  ctx.save(); ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(20,26,44,0.9)'; rr(ctx, EXIT.x - 10, EXIT.y, EXIT.w + 20, 30, 9); ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,120,0.85)'; ctx.lineWidth = 2; rr(ctx, EXIT.x - 10, EXIT.y, EXIT.w + 20, 30, 9); ctx.stroke();
  ctx.fillStyle = '#ffe6b0'; ctx.font = '800 13px "Space Grotesk", sans-serif'; ctx.fillText('🎪 무대로', EXIT.x + EXIT.w / 2, EXIT.y + 19);
  ctx.restore(); ctx.textAlign = 'start';
}

// 큰 '입구(문)' — 아치 + 커튼 + 빛나는 입구. EDDIE가 다가가 Space로 입장.
function drawStation(ctx, s, active, t, cfg) {
  const fw = DOOR_W, fh = DOOR_H, fx = s.cx - fw / 2, fy = s.cy - fh / 2, cx = s.cx, by = fy + fh;
  const acc = s.id === 'play' ? '255,158,60' : cfg.accent;
  const archR = fw / 2;

  // 바닥 풋라이트 + 그림자
  const fg = ctx.createRadialGradient(cx, by, 4, cx, by, 130);
  fg.addColorStop(0, `rgba(${acc},${active ? 0.5 : 0.3})`); fg.addColorStop(1, `rgba(${acc},0)`);
  ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(cx, by + 6, active ? 130 : 108, active ? 32 : 24, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(60,40,20,0.2)'; ctx.beginPath(); ctx.ellipse(cx, by + 4, 104, 13, 0, 0, 6.283); ctx.fill();

  // 활성 글로우
  if (active) { ctx.save(); ctx.shadowColor = `rgba(${acc},0.9)`; ctx.shadowBlur = 40; ctx.strokeStyle = `rgba(${acc},0.0)`; archPath(ctx, fx, fy, fw, fh, archR); ctx.stroke(); ctx.restore(); }

  // 문 프레임(아치)
  ctx.save(); ctx.shadowColor = 'rgba(40,24,10,0.35)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 10;
  const frame = ctx.createLinearGradient(fx, fy, fx, by); frame.addColorStop(0, `rgba(${acc},1)`); frame.addColorStop(1, `rgba(${acc},0.82)`);
  ctx.fillStyle = frame; archPath(ctx, fx, fy, fw, fh, archR); ctx.fill(); ctx.restore();
  // 프레임 줄무늬(차양 느낌)
  ctx.save(); archPath(ctx, fx, fy, fw, fh, archR); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; for (let x = fx - fh; x < fx + fw; x += 30) ctx.fillRect(x, fy, 15, fh);
  ctx.restore();

  // 안쪽 입구(어두운 통로 + 중앙 빛)
  const iw = fw - 40, ih = fh - 34, ix = cx - iw / 2, iy = fy + 26;
  ctx.save(); archPath(ctx, ix, iy, iw, ih, iw / 2); ctx.clip();
  const inner = ctx.createRadialGradient(cx, iy + ih * 0.5, 10, cx, iy + ih * 0.5, ih * 0.8);
  inner.addColorStop(0, `rgba(${acc},0.5)`); inner.addColorStop(0.5, 'rgba(40,26,40,0.95)'); inner.addColorStop(1, 'rgba(20,12,22,0.98)');
  ctx.fillStyle = inner; ctx.fillRect(ix, iy, iw, ih);
  // 큰 아이콘(둥실)
  const bob = Math.sin(t * 0.08 + (s.id === 'play' ? 1 : 0)) * 5;
  ctx.textAlign = 'center'; ctx.font = '88px sans-serif'; ctx.fillText(s.icon, cx, iy + ih * 0.5 + 18 + bob);
  ctx.restore();

  // 라벨 배너(문 위)
  ctx.save(); ctx.textAlign = 'center';
  const bw = Math.max(150, ctx.measureText(s.label).width + 60);
  ctx.fillStyle = 'rgba(20,26,44,0.92)'; rr(ctx, cx - bw / 2, fy - 6, bw, 38, 12); ctx.fill();
  ctx.strokeStyle = `rgba(${acc},0.95)`; ctx.lineWidth = 2; rr(ctx, cx - bw / 2, fy - 6, bw, 38, 12); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = '800 20px "Space Grotesk", sans-serif'; ctx.fillText(s.label, cx, fy + 14);
  ctx.fillStyle = `rgb(${acc})`; ctx.font = '700 11px "Space Grotesk", sans-serif'; ctx.fillText(s.sub, cx, fy + 28);
  ctx.restore();

  // 입장 안내
  if (active) { ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = `rgb(${acc})`; ctx.font = '800 15px "Space Grotesk", sans-serif'; ctx.fillText('들어가기 ▸ Space', cx, by + 40 + Math.sin(t * 0.14) * 2); ctx.restore(); }
  ctx.textAlign = 'start';
}
// 아치(위가 둥근 문) 경로
function archPath(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, 0, false);
  ctx.lineTo(x + w, y + h); ctx.closePath();
}

function bunting(ctx, W, t) {
  ctx.save(); ctx.strokeStyle = 'rgba(90,60,40,0.4)'; ctx.lineWidth = 2;
  ctx.beginPath(); for (let x = 0; x <= W; x += 8) ctx.lineTo(x, 16 + Math.sin(x / 90) * 10); ctx.stroke();
  const cols = ['#ff6b6b', '#ffd24a', '#5ad17a', '#6fb7ff', '#b18bff'];
  for (let i = 0, x = 34; x < W; x += 64, i++) {
    const y = 24 + Math.sin(x / 90) * 10, tw = 0.45 + 0.35 * Math.sin(t * 0.1 + i);
    ctx.fillStyle = `rgba(255,240,180,${tw})`; ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.283); ctx.fill();
    ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.arc(x, y, 5.5, 0, 6.283); ctx.fill();
  }
  ctx.restore();
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
