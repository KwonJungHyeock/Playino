// sensorRoom.js — 박물관형 센서 전시관(탑다운). EDDIE가 걸어다니며
//   📖 이론관(자료 가로슬라이드 + 13번 핀 블록코딩 체험) / 🎮 체험관(미니게임) 입구로 입장.
//   밝은 카니발/박물관 톤. config 기반 확장형.
import { createWorld } from '../engine/topdown.js';
import { sfx } from '../app/sfx.js';
import { progress } from '../app/progress.js';
import { board } from '../app/board.js';
import { showLedGame } from './ledGame.js';

const DOOR_W = 264, DOOR_H = 318;
const roomImg = new Image(); roomImg.src = '/brand/room-bg.png';   // 전시관 배경(있으면 사용)

const ROOMS_CFG = {
  led: {
    name: '반짝반짝 라이트쇼', sensor: 'LED · 발광 다이오드', icon: '💡', accent: '255,200,74',
    intro: '이론관에서 LED를 배우고, 체험관에서 직접 연주해보자! 🎶',
    info: ['led-info-1', 'led-info-2', 'led-info-3'],   // /brand/{name}.png 가로 슬라이드
    blockPin: 13,                                        // 보드 내장 LED(추가 결선 없이 체험)
    play: (root, opt) => showLedGame(root, opt),
  },
};

export function showSensorRoom(root, { id, onExit } = {}) {
  const cfg = ROOMS_CFG[id]; if (!cfg) { onExit?.(); return; }
  const VW = Math.max(900, window.innerWidth), VH = Math.max(440, window.innerHeight);
  const stations = [
    { id: 'theory', icon: '📖', label: '이론관', sub: '자료 + 블록코딩', cx: VW * 0.32, cy: VH * 0.46 },
    { id: 'play', icon: '🎮', label: '체험관', sub: '미니게임', cx: VW * 0.68, cy: VH * 0.46 },
  ];
  const EXIT = { x: VW / 2 - 46, y: VH - 72, w: 92, h: 46 };

  root.innerHTML = `
    <div class="scene game-scene scene-fade escape-scene sroom2">
      <div class="world-host" id="world-host"></div>
      <div class="sr-top"><span class="sr-chip">${cfg.icon}</span> <b>${cfg.name}</b> <span class="sr-sensor">· ${cfg.sensor}</span></div>
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
      ...stations.map((s) => ({ x: s.cx - DOOR_W / 2, y: s.cy - DOOR_H / 2, w: DOOR_W, h: DOOR_H })),
    ],
    triggers: [
      ...stations.map((s) => ({ id: s.id, x: s.cx - DOOR_W / 2, y: s.cy + DOOR_H / 2, w: DOOR_W, h: 56 })),
      { id: '__exit', ...EXIT },
    ],
    draw: (ctx, st) => drawRoom(ctx, st, stations, cfg, VW, VH, EXIT),
  };

  const world = createWorld(host, map, {
    onInteract: handle, onFrame: updateHint,
    onEddieClick: () => guide('이론관 먼저? 체험관 먼저? 골라봐! 😎', 2600),
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
    hintEl.innerHTML = tr.id === '__exit' ? '🎪 Space · 무대로' : tr.id === 'theory' ? '📖 Space · 이론관 입장' : '🎮 Space · 체험관 입장';
    hintEl.classList.add('show');
  }
  function drawVignette(ctx, st, canvas) {
    const g = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.46, canvas.height * 0.42, canvas.width / 2, canvas.height / 2, canvas.height * 1.02);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,30,10,0.18)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ───────── 이론관 오버레이 (자료 슬라이드 + 블록코딩) ─────────
  function openTheory() {
    world.pause();
    const v = root.querySelector('#sr-tview'); v.hidden = false;
    let tab = 'info', ci = 0, blink = null, on = false;
    const INFO = (cfg.info || []).map((n) => `/brand/${n}.png`);

    v.innerHTML = `<div class="prep-card tv-card">
      <div class="tv-tabs">
        <button class="tv-tab on" data-t="info">📚 자료</button>
        <button class="tv-tab" data-t="code">🧩 블록코딩</button>
        <button class="tv-x" id="tv-x">✕ 나가기</button>
      </div>
      <div class="tv-body" id="tv-body"></div>
    </div>`;
    const bodyEl = v.querySelector('#tv-body');
    v.querySelectorAll('.tv-tab').forEach((b) => b.onclick = () => { if (tab === b.dataset.t) return; tab = b.dataset.t; if (tab !== 'code') stopBlink(); v.querySelectorAll('.tv-tab').forEach((x) => x.classList.toggle('on', x === b)); renderTab(); });
    v.querySelector('#tv-x').onclick = close;
    function close() { stopBlink(); v.hidden = true; v.innerHTML = ''; world.resume(); }

    function renderTab() { tab === 'info' ? renderInfo() : renderCode(); }

    // 자료: 가로 슬라이드(인포그래픽)
    function renderInfo() {
      if (!INFO.length) { bodyEl.innerHTML = `<p class="sr-tbody" style="text-align:center;padding:40px">자료 이미지를 준비 중이에요.</p>`; return; }
      bodyEl.innerHTML = `
        <div class="tv-slider">
          <button class="tv-arrow" id="tv-prev">◀</button>
          <div class="tv-stage" id="tv-stage"></div>
          <button class="tv-arrow" id="tv-next">▶</button>
        </div>
        <div class="tv-dots">${INFO.map((_, i) => `<i class="${i === ci ? 'on' : ''}" data-i="${i}"></i>`).join('')}</div>
        <p class="tv-cap">자료를 좌우로 넘겨보고, <b>🧩 블록코딩</b> 탭에서 직접 켜봐!</p>`;
      const stage = bodyEl.querySelector('#tv-stage');
      const showSlide = () => {
        stage.style.backgroundImage = `url(${INFO[ci]})`;
        bodyEl.querySelectorAll('.tv-dots i').forEach((d, i) => d.classList.toggle('on', i === ci));
      };
      showSlide();
      bodyEl.querySelector('#tv-prev').onclick = () => { sfx.hover(); ci = (ci - 1 + INFO.length) % INFO.length; showSlide(); };
      bodyEl.querySelector('#tv-next').onclick = () => { sfx.hover(); ci = (ci + 1) % INFO.length; showSlide(); };
      bodyEl.querySelectorAll('.tv-dots i').forEach((d) => d.onclick = () => { ci = +d.dataset.i; showSlide(); });
    }

    // 블록코딩: 13번 핀 LED 켜고/끄고/깜빡임 속도
    function renderCode() {
      bodyEl.innerHTML = `
        <div class="bc">
          <div class="bc-prog">
            <div class="bc-h">내 블록 프로그램</div>
            <div class="bc-block on">🔆 13번 LED <b>켜기</b></div>
            <div class="bc-block wait">⏱ <b class="bc-d">0.4</b>초 기다리기</div>
            <div class="bc-block off">⚫ 13번 LED <b>끄기</b></div>
            <div class="bc-block wait">⏱ <b class="bc-d">0.4</b>초 기다리기</div>
            <div class="bc-block loop">🔁 계속 반복하기</div>
          </div>
          <div class="bc-side">
            <div class="bc-led" id="bc-led"><span>13</span></div>
            <label class="bc-lab">깜빡임 속도 <b id="bc-spd">0.4초</b></label>
            <input type="range" id="bc-range" min="120" max="1000" step="20" value="400">
            <div class="bc-actions">
              <button class="cel-go" id="bc-run">▶ 실행</button>
              <button class="prep-btn" id="bc-stop">⏹ 정지</button>
            </div>
            <button class="prep-btn bc-conn" id="bc-conn">${board.connected ? '🔌 보드 연결됨 ✓' : '🔌 보드 연결(실물 13번 LED)'}</button>
            <div class="bc-status" id="bc-status">${board.connected ? '실행하면 보드의 13번 LED가 실제로 깜빡여요!' : '연결하면 실제 13번 LED가 깜빡여요. (안 해도 화면으로 체험 가능)'}</div>
          </div>
        </div>`;
      const ledEl = bodyEl.querySelector('#bc-led'), range = bodyEl.querySelector('#bc-range');
      const spd = bodyEl.querySelector('#bc-spd'), status = bodyEl.querySelector('#bc-status');
      const setDelayLabels = () => { const s = (+range.value / 1000).toFixed(1); spd.textContent = s + '초'; bodyEl.querySelectorAll('.bc-d').forEach((e) => e.textContent = s); };
      setDelayLabels();
      range.oninput = () => { setDelayLabels(); if (blink) startBlink(); };
      bodyEl.querySelector('#bc-run').onclick = () => { sfx.click(); startBlink(); };
      bodyEl.querySelector('#bc-stop').onclick = () => { sfx.pop(); stopBlink(); };
      bodyEl.querySelector('#bc-conn').onclick = async () => {
        if (board.connected) return;
        status.textContent = '연결 중… 포트를 골라주세요 🔌';
        try { await board.connect(); bodyEl.querySelector('#bc-conn').textContent = '🔌 보드 연결됨 ✓'; status.textContent = '실행하면 보드의 13번 LED가 실제로 깜빡여요!'; }
        catch (e) { status.textContent = board.classify(e).note; }
      };
      function paint(o) { ledEl.classList.toggle('on', o); }
      function startBlink() {
        stopBlink(); const sp = +range.value;
        blink = setInterval(() => { on = !on; paint(on); if (board.connected) board.digital(cfg.blockPin, on).catch(() => {}); }, sp);
        on = true; paint(true); if (board.connected) board.digital(cfg.blockPin, true).catch(() => {});
        status.textContent = board.connected ? '실제 13번 LED가 깜빡이는 중! 속도를 바꿔봐 🎚️' : '화면 LED가 깜빡이는 중! 보드를 연결하면 실물도 깜빡여요.';
      }
    }

    function stopBlink() { if (blink) { clearInterval(blink); blink = null; } on = false; const l = root.querySelector('#bc-led'); if (l) l.classList.remove('on'); if (board.connected) board.digital(cfg.blockPin, false).catch(() => {}); }

    renderTab();
  }
}

// ───────── 그리기 ─────────
function drawRoom(ctx, st, stations, cfg, VW, VH, EXIT) {
  const t = st?.t || 0, activeId = st?.activeTrigger?.id;
  if (roomImg.complete && roomImg.naturalWidth) {
    drawCover(ctx, roomImg, VW, VH);
    ctx.fillStyle = 'rgba(30,18,40,0.14)'; ctx.fillRect(0, 0, VW, VH);
  } else {
    const wall = ctx.createLinearGradient(0, 0, 0, VH * 0.4); wall.addColorStop(0, '#f6ead6'); wall.addColorStop(1, '#ecd8bf');
    ctx.fillStyle = wall; ctx.fillRect(0, 0, VW, VH * 0.4);
    const fl = ctx.createLinearGradient(0, VH * 0.4, 0, VH); fl.addColorStop(0, '#e7cfa6'); fl.addColorStop(1, '#d6b585');
    ctx.fillStyle = fl; ctx.fillRect(0, VH * 0.4, VW, VH * 0.6);
    ctx.strokeStyle = 'rgba(120,90,50,0.16)'; ctx.lineWidth = 2;
    for (let y = VH * 0.45; y < VH; y += 48) { ctx.beginPath(); ctx.moveTo(16, y); ctx.lineTo(VW - 16, y); ctx.stroke(); }
    bunting(ctx, VW, t);
  }
  for (const s of stations) drawStation(ctx, s, s.id === activeId, t, cfg);
  ctx.save(); ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(20,26,44,0.9)'; rr(ctx, EXIT.x - 10, EXIT.y, EXIT.w + 20, 30, 9); ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,120,0.85)'; ctx.lineWidth = 2; rr(ctx, EXIT.x - 10, EXIT.y, EXIT.w + 20, 30, 9); ctx.stroke();
  ctx.fillStyle = '#ffe6b0'; ctx.font = '800 13px "Space Grotesk", sans-serif'; ctx.fillText('🎪 무대로', EXIT.x + EXIT.w / 2, EXIT.y + 19);
  ctx.restore(); ctx.textAlign = 'start';
}

function drawStation(ctx, s, active, t, cfg) {
  const fw = DOOR_W, fh = DOOR_H, fx = s.cx - fw / 2, fy = s.cy - fh / 2, cx = s.cx, by = fy + fh;
  const acc = s.id === 'play' ? '255,158,60' : cfg.accent;
  const archR = fw / 2;
  const fg = ctx.createRadialGradient(cx, by, 4, cx, by, 130);
  fg.addColorStop(0, `rgba(${acc},${active ? 0.5 : 0.3})`); fg.addColorStop(1, `rgba(${acc},0)`);
  ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(cx, by + 6, active ? 130 : 108, active ? 32 : 24, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(60,40,20,0.2)'; ctx.beginPath(); ctx.ellipse(cx, by + 4, 104, 13, 0, 0, 6.283); ctx.fill();
  ctx.save(); ctx.shadowColor = 'rgba(40,24,10,0.35)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 10;
  const frame = ctx.createLinearGradient(fx, fy, fx, by); frame.addColorStop(0, `rgba(${acc},1)`); frame.addColorStop(1, `rgba(${acc},0.82)`);
  ctx.fillStyle = frame; archPath(ctx, fx, fy, fw, fh, archR); ctx.fill(); ctx.restore();
  ctx.save(); archPath(ctx, fx, fy, fw, fh, archR); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; for (let x = fx - fh; x < fx + fw; x += 30) ctx.fillRect(x, fy, 15, fh);
  ctx.restore();
  const iw = fw - 40, ih = fh - 34, ix = cx - iw / 2, iy = fy + 26;
  ctx.save(); archPath(ctx, ix, iy, iw, ih, iw / 2); ctx.clip();
  const inner = ctx.createRadialGradient(cx, iy + ih * 0.5, 10, cx, iy + ih * 0.5, ih * 0.8);
  inner.addColorStop(0, `rgba(${acc},0.5)`); inner.addColorStop(0.5, 'rgba(40,26,40,0.95)'); inner.addColorStop(1, 'rgba(20,12,22,0.98)');
  ctx.fillStyle = inner; ctx.fillRect(ix, iy, iw, ih);
  const bob = Math.sin(t * 0.08 + (s.id === 'play' ? 1 : 0)) * 5;
  ctx.textAlign = 'center'; ctx.font = '88px sans-serif'; ctx.fillText(s.icon, cx, iy + ih * 0.5 + 18 + bob);
  ctx.restore();
  ctx.save(); ctx.textAlign = 'center';
  const bw = Math.max(150, ctx.measureText(s.label).width + 60);
  ctx.fillStyle = 'rgba(20,26,44,0.92)'; rr(ctx, cx - bw / 2, fy - 6, bw, 38, 12); ctx.fill();
  ctx.strokeStyle = `rgba(${acc},0.95)`; ctx.lineWidth = 2; rr(ctx, cx - bw / 2, fy - 6, bw, 38, 12); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = '800 20px "Space Grotesk", sans-serif'; ctx.fillText(s.label, cx, fy + 14);
  ctx.fillStyle = `rgb(${acc})`; ctx.font = '700 11px "Space Grotesk", sans-serif'; ctx.fillText(s.sub, cx, fy + 28);
  ctx.restore();
  if (active) { ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = `rgb(${acc})`; ctx.font = '800 15px "Space Grotesk", sans-serif'; ctx.fillText('들어가기 ▸ Space', cx, by + 40 + Math.sin(t * 0.14) * 2); ctx.restore(); }
  ctx.textAlign = 'start';
}
function archPath(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.arc(x + r, y + r, r, Math.PI, 0, false); ctx.lineTo(x + w, y + h); ctx.closePath(); }
function drawCover(ctx, img, W, H) { const ir = img.naturalWidth / img.naturalHeight, r = W / H; let dw, dh; if (ir > r) { dh = H; dw = H * ir; } else { dw = W; dh = W / ir; } ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh); }
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
