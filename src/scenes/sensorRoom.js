// sensorRoom.js — 박물관형 센서 전시관(탑다운). EDDIE가 걸어다니며
//   📖 이론관(자료 가로슬라이드 + 13번 핀 블록코딩 체험) / 🎮 체험관(미니게임) 입구로 입장.
//   밝은 카니발/박물관 톤. config 기반 확장형.
import { createWorld } from '../engine/topdown.js';
import { sfx } from '../app/sfx.js';
import { progress } from '../app/progress.js';
import { board } from '../app/board.js';
import { showLedGame } from './ledGame.js';

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
  const FLOOR_Y = VH * 0.74;                       // EDDIE가 걷는 바닥 라인(좌우 전용)
  // 화살표 푯말 — 각 문을 가리킴(왼쪽=이론관/오른쪽=체험관)
  const stations = [
    { id: 'theory', icon: '📖', label: '이론관', sub: '자료 + 블록코딩', dir: -1, cx: VW * 0.27, signY: VH * 0.50, postY: FLOOR_Y },
    { id: 'play', icon: '🎮', label: '체험관', sub: '미니게임', dir: 1, cx: VW * 0.73, signY: VH * 0.50, postY: FLOOR_Y },
  ];

  root.innerHTML = `
    <div class="scene game-scene scene-fade escape-scene sroom2">
      <div class="world-host" id="world-host"></div>
      <div class="sr-top"><span class="sr-chip">${cfg.icon}</span> <b>${cfg.name}</b> <span class="sr-sensor">· ${cfg.sensor}</span></div>
      <button class="bx-exit" id="sr-exit">✕ 무대로</button>
      <button class="snd-toggle" id="snd-toggle">${sfx.muted ? '🔇' : '🔊'}</button>
      <div class="hud-controls">⬅➡ 좌우 이동 · 문 끝까지 가면 입장 · ✕ 무대로</div>
      <div class="sr-fade" id="sr-fade"></div>
      <div class="sr-theory-view" id="sr-tview" hidden></div>
    </div>`;

  const host = root.querySelector('#world-host');
  const fade = root.querySelector('#sr-fade');
  const snd = root.querySelector('#snd-toggle'); snd.onclick = () => { const m = sfx.toggle(); snd.textContent = m ? '🔇' : '🔊'; };
  root.querySelector('#sr-exit').onclick = () => { sfx.pop(); destroyAll(); onExit?.(); };
  const bubble = document.createElement('div'); bubble.className = 'eddie-bubble'; host.appendChild(bubble);
  let bubbleT = null;
  function guide(t, ms = 4200) { bubble.innerHTML = `🤖 ${t}`; bubble.classList.add('show'); clearTimeout(bubbleT); if (ms) bubbleT = setTimeout(() => bubble.classList.remove('show'), ms); }

  const map = {
    width: VW, height: VH, bg: '#efe2c8', playerScale: 1.75, lockVertical: true,
    spawn: { x: VW / 2 - 14, y: FLOOR_Y - 30 },
    walls: [{ x: 0, y: 0, w: 14, h: VH }, { x: VW - 14, y: 0, w: 14, h: VH }],
    // 문 끝(좌/우 가장자리)에 닿으면 자동 입장(페이드)
    triggers: [
      { id: 'theory', auto: true, x: 0, y: 0, w: VW * 0.13, h: VH },
      { id: 'play', auto: true, x: VW * 0.87, y: 0, w: VW * 0.13, h: VH },
    ],
    draw: (ctx, st) => drawRoom(ctx, st, stations, cfg, VW, VH),
  };

  const world = createWorld(host, map, {
    onAuto: enterDoor, onFrame: onFrame,
    onEddieClick: () => guide('왼쪽=이론관 📖 · 오른쪽=체험관 🎮 — 문 끝까지 걸어가!', 2800),
    onDrawOverlay: drawVignette,
  });
  setTimeout(() => guide(cfg.intro), 500);

  function destroyAll() { try { world.destroy(); } catch (_) {} }
  let entering = false;
  function enterDoor(idTrig) {
    if (entering) return; entering = true;
    sfx.start(); world.pause(); fade.classList.add('on');
    setTimeout(() => {
      if (idTrig === 'theory') { openTheory(); fade.classList.remove('on'); entering = false; }
      else { destroyAll(); cfg.play(root, { onExit: () => showSensorRoom(root, { id, onExit }) }); }
    }, 480);
  }
  function onFrame(state) {
    const p = state.player, cam = state.cam;
    bubble.style.left = ((p.x + p.w / 2) - cam.x) + 'px'; bubble.style.top = (p.y - cam.y - 110) + 'px';
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
    function close() { stopBlink(); v.hidden = true; v.innerHTML = ''; world.teleport(VW * 0.5 - 14, FLOOR_Y - 30); world.resume(); }

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
function drawRoom(ctx, st, stations, cfg, VW, VH) {
  const t = st?.t || 0, activeId = st?.activeTrigger?.id;
  if (roomImg.complete && roomImg.naturalWidth) {
    drawCover(ctx, roomImg, VW, VH);
    ctx.fillStyle = 'rgba(20,12,30,0.06)'; ctx.fillRect(0, 0, VW, VH);
  } else {
    const wall = ctx.createLinearGradient(0, 0, 0, VH * 0.4); wall.addColorStop(0, '#f6ead6'); wall.addColorStop(1, '#ecd8bf');
    ctx.fillStyle = wall; ctx.fillRect(0, 0, VW, VH * 0.4);
    const fl = ctx.createLinearGradient(0, VH * 0.4, 0, VH); fl.addColorStop(0, '#e7cfa6'); fl.addColorStop(1, '#d6b585');
    ctx.fillStyle = fl; ctx.fillRect(0, VH * 0.4, VW, VH * 0.6);
    ctx.strokeStyle = 'rgba(120,90,50,0.16)'; ctx.lineWidth = 2;
    for (let y = VH * 0.45; y < VH; y += 48) { ctx.beginPath(); ctx.moveTo(16, y); ctx.lineTo(VW - 16, y); ctx.stroke(); }
    bunting(ctx, VW, t);
  }
  // 문 쪽 빛 기둥(좌/우 끝) — 가까이 갈수록 환해지는 입구 연출
  const px = st?.player ? st.player.x : VW / 2;
  doorGlow(ctx, VW * 0.05, VH, '120,225,255', 1 - Math.min(1, px / (VW * 0.32)));
  doorGlow(ctx, VW * 0.95, VH, '255,140,90', 1 - Math.min(1, (VW - px) / (VW * 0.32)));
  for (const s of stations) drawSign(ctx, s, s.id === activeId, t);
}

function doorGlow(ctx, x, VH, acc, k) {
  if (k <= 0.02) return;
  const g = ctx.createLinearGradient(x, 0, x, VH); g.addColorStop(0, `rgba(${acc},${0.35 * k})`); g.addColorStop(1, `rgba(${acc},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - 90, 0, 180, VH);
}

// 화살표 푯말(문을 가리킴) — 기둥 + 화살표 보드 + 큰 방향 화살표
function drawSign(ctx, s, active, t) {
  const dir = s.dir, cx = s.cx, boardY = s.signY, baseY = s.postY;
  const acc = s.id === 'play' ? '255,140,90' : '120,225,255';
  const pulse = 0.55 + 0.45 * Math.sin(t * 0.12 + (dir > 0 ? 1 : 0));
  const bob = active ? Math.sin(t * 0.12) * 3 : 0, by = boardY + bob;

  // 바닥 풋라이트
  const fg = ctx.createRadialGradient(cx, baseY, 4, cx, baseY, 110);
  fg.addColorStop(0, `rgba(${acc},${active ? 0.5 : 0.3})`); fg.addColorStop(1, `rgba(${acc},0)`);
  ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(cx, baseY, active ? 96 : 76, active ? 26 : 20, 0, 0, 6.283); ctx.fill();
  // 기둥
  const post = ctx.createLinearGradient(cx - 7, 0, cx + 7, 0); post.addColorStop(0, '#6f4a2c'); post.addColorStop(.5, '#8a5e38'); post.addColorStop(1, '#6f4a2c');
  ctx.fillStyle = post; ctx.fillRect(cx - 7, by + 26, 14, baseY - (by + 26));

  // 화살표 보드
  const bw = 232, bh = 78;
  ctx.save();
  ctx.fillStyle = 'rgba(16,12,24,0.88)'; arrowBoard(ctx, cx, by, bw, bh, dir); ctx.fill();
  ctx.shadowColor = `rgba(${acc},${pulse})`; ctx.shadowBlur = 28 * pulse;
  ctx.strokeStyle = `rgba(${acc},1)`; ctx.lineWidth = 4; arrowBoard(ctx, cx, by, bw - 8, bh - 8, dir); ctx.stroke();
  ctx.shadowBlur = 14; ctx.textAlign = 'center';
  const tShift = -dir * 12;
  ctx.fillStyle = '#fff'; ctx.font = '900 24px "Space Grotesk", sans-serif'; ctx.fillText(`${s.icon} ${s.label}`, cx + tShift, by + 1);
  ctx.shadowBlur = 8; ctx.fillStyle = `rgb(${acc})`; ctx.font = '700 12px "Space Grotesk", sans-serif'; ctx.fillText(s.sub, cx + tShift, by + 21);
  ctx.restore();

  // 큰 방향 화살표(문 쪽으로 깜빡)
  ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = `rgba(${acc},${0.6 + 0.4 * Math.sin(t * 0.18)})`;
  ctx.font = '900 34px "Space Grotesk", sans-serif';
  ctx.fillText(dir > 0 ? '▶' : '◀', cx + dir * (bw / 2 + 26) + dir * Math.abs(Math.sin(t * 0.16)) * 8, by + 10);
  ctx.restore(); ctx.textAlign = 'start';
}
function arrowBoard(ctx, cx, cy, w, h, dir) {
  const x = cx - w / 2, y = cy - h / 2, n = 26;
  ctx.beginPath();
  if (dir > 0) { ctx.moveTo(x, y); ctx.lineTo(x + w - n, y); ctx.lineTo(x + w, cy); ctx.lineTo(x + w - n, y + h); ctx.lineTo(x, y + h); }
  else { ctx.moveTo(x + w, y); ctx.lineTo(x + n, y); ctx.lineTo(x, cy); ctx.lineTo(x + n, y + h); ctx.lineTo(x + w, y + h); }
  ctx.closePath();
}
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
