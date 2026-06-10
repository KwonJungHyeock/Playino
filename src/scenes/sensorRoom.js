// sensorRoom.js — 박물관형 센서 전시관(탑다운). EDDIE가 걸어다니며
//   📖 이론관(자료 가로슬라이드 + 13번 핀 블록코딩 체험) / 🎮 체험관(미니게임) 입구로 입장.
//   밝은 카니발/박물관 톤. config 기반 확장형.
import { createWorld } from '../engine/topdown.js';
import { sfx } from '../app/sfx.js';
import { progress } from '../app/progress.js';
import { board } from '../app/board.js';
import { mountEddieRig } from '../app/eddieRig.js';
import { showLedGame } from './ledGame.js';

const roomImg = new Image(); roomImg.src = '/brand/room-bg.png';   // 전시관 배경(있으면 사용)

const ROOMS_CFG = {
  led: {
    name: '반짝반짝 라이트쇼', sensor: 'LED · 발광 다이오드', icon: '💡', accent: '255,200,74',
    intro: '이론관에서 LED를 배우고, 체험관에서 직접 연주해보자! 🎶',
    info: ['led-info-1', 'led-info-2', 'led-info-3'],   // /brand/{name}.png 가로 슬라이드
    captions: [
      'LED는 색마다 빛 에너지(파장)가 달라요 — 노랑·초록·빨강! 🌈',
      '전자와 정공이 ‘딱’ 만나면 빛이 짠! 하고 나와요 ✨',
      '신호등·시계·자전거 후미등… LED는 생활 곳곳에 있어요! 🚦',
    ],
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
    let tab = 'info', ci = 0, blink = null, ledOn = false, blinkOn = false;
    const INFO = (cfg.info || []).map((n) => `/brand/${n}.png`), CAPS = cfg.captions || [];

    v.innerHTML = `
      <div class="prep-card tv-card">
        <div class="tv-tabs">
          <button class="tv-tab on" data-t="info">📚 자료</button>
          <button class="tv-tab" data-t="code">🎛️ LED 제어</button>
          <button class="tv-x" id="tv-x">✕ 나가기</button>
        </div>
        <div class="tv-body" id="tv-body"></div>
      </div>
      <div class="tv-eddie-wrap" id="tv-ew" hidden>
        <div class="tv-bubble" id="tv-bubble"></div>
        <div class="tv-eddie" id="tv-eddie"></div>
      </div>`;
    const bodyEl = v.querySelector('#tv-body'), ew = v.querySelector('#tv-ew'), bub = v.querySelector('#tv-bubble');
    mountEddieRig(v.querySelector('#tv-eddie'));
    v.querySelectorAll('.tv-tab').forEach((b) => b.onclick = () => { if (tab === b.dataset.t) return; tab = b.dataset.t; if (tab !== 'code') stopBlink(); v.querySelectorAll('.tv-tab').forEach((x) => x.classList.toggle('on', x === b)); renderTab(); });
    v.querySelector('#tv-x').onclick = close;
    function close() { stopBlink(); if (board.connected) board.digital(cfg.blockPin, false).catch(() => {}); v.hidden = true; v.innerHTML = ''; world.teleport(VW * 0.5 - 14, FLOOR_Y - 30); world.resume(); }
    function renderTab() { tab === 'info' ? renderInfo() : renderControl(); }

    // 자료: 큰 슬라이드 + 흰 박스 밖(여백)의 EDDIE가 설명
    function renderInfo() {
      ew.hidden = false;
      if (!INFO.length) { ew.hidden = true; bodyEl.innerHTML = `<p class="sr-tbody" style="text-align:center;padding:50px">자료 이미지를 준비 중이에요.</p>`; return; }
      bodyEl.innerHTML = `
        <div class="tv-slider">
          <button class="tv-arrow" id="tv-prev">◀</button>
          <div class="tv-stage" id="tv-stage"></div>
          <button class="tv-arrow" id="tv-next">▶</button>
        </div>
        <div class="tv-dots">${INFO.map((_, i) => `<i class="${i === ci ? 'on' : ''}" data-i="${i}"></i>`).join('')}</div>`;
      const stage = bodyEl.querySelector('#tv-stage');
      const show = () => {
        stage.style.backgroundImage = `url(${INFO[ci]})`;
        bodyEl.querySelectorAll('.tv-dots i').forEach((d, i) => d.classList.toggle('on', i === ci));
        bub.innerHTML = `🤖 ${CAPS[ci] || '좌우로 넘겨봐!'}`; bub.classList.remove('pop'); void bub.offsetWidth; bub.classList.add('pop');
      };
      show();
      const go = (d) => { sfx.hover(); ci = (ci + d + INFO.length) % INFO.length; show(); };
      bodyEl.querySelector('#tv-prev').onclick = () => go(-1);
      bodyEl.querySelector('#tv-next').onclick = () => go(1);
      bodyEl.querySelectorAll('.tv-dots i').forEach((d) => d.onclick = () => { ci = +d.dataset.i; show(); });
    }

    // LED 제어 대시보드: 디지털(ON/OFF) + 깜빡임 (D13은 디지털 전용 — 아날로그 없음)
    function renderControl() {
      ew.hidden = true;
      bodyEl.innerHTML = `
        <div class="dash">
          <div class="dash-led">
            <div class="dl-bulb" id="dl-bulb"><span>LED</span></div>
            <div class="dl-state" id="dl-state">상태 · OFF (LOW)</div>
            <div class="dl-pin">13번 핀 · 디지털 출력</div>
          </div>
          <div class="dash-cards">
            <div class="dcard">
              <div class="dc-h">🔌 디지털 제어 <span>HIGH / LOW</span></div>
              <div class="dc-btns"><button class="dbtn on" id="d-on">켜기 ON</button><button class="dbtn off" id="d-off">끄기 OFF</button></div>
            </div>
            <div class="dcard">
              <div class="dc-h">⏱️ 깜빡임 <span>속도 <b id="b-spd">0.4초</b></span></div>
              <div class="dc-row"><button class="dbtn ghost" id="b-toggle">▶ 깜빡이기</button><input type="range" id="b-range" min="120" max="1000" step="20" value="400"></div>
            </div>
            <button class="dbtn ghost dc-conn" id="dc-conn">${board.connected ? '🔌 보드 연결됨 ✓' : '🔌 보드 연결(실물 LED)'}</button>
            <div class="dc-status" id="dc-status">${board.connected ? '버튼으로 실제 13번 LED를 제어해봐!' : '연결하면 실제 LED도 제어돼요. (안 해도 화면으로 체험)'}</div>
          </div>
        </div>`;
      const bulb = bodyEl.querySelector('#dl-bulb'), stateEl = bodyEl.querySelector('#dl-state');
      const bRange = bodyEl.querySelector('#b-range'), bSpd = bodyEl.querySelector('#b-spd'), bTog = bodyEl.querySelector('#b-toggle');
      const status = bodyEl.querySelector('#dc-status');
      function send(o) { if (board.connected) board.digital(cfg.blockPin, o).catch(() => {}); }
      function paint(o) { bulb.classList.toggle('on', o); stateEl.textContent = o ? '상태 · ON (HIGH)' : '상태 · OFF (LOW)'; }
      const delayLabel = () => bSpd.textContent = (+bRange.value / 1000).toFixed(1) + '초';
      const dOn = bodyEl.querySelector('#d-on'), dOff = bodyEl.querySelector('#d-off');
      function setLed(o, doSend) { ledOn = o; paint(o); dOn.classList.toggle('active', o); dOff.classList.toggle('active', !o); if (doSend) send(o); }
      setLed(ledOn, false); delayLabel();
      dOn.onclick = () => { sfx.ok(); stopBlink(); setLed(true, true); };
      dOff.onclick = () => { sfx.pop(); stopBlink(); setLed(false, true); };
      bRange.oninput = () => { delayLabel(); if (blinkOn) startBlink(); };
      bTog.onclick = () => { if (blinkOn) { sfx.pop(); stopBlink(); paint(ledOn); send(ledOn); } else { sfx.click(); startBlink(); } };
      function startBlink() {
        stopBlink(); blinkOn = true; bTog.textContent = '⏹ 멈추기';
        let o = true; paint(true); send(true);
        blink = setInterval(() => { o = !o; paint(o); send(o); }, +bRange.value);
        status.textContent = '깜빡이는 중! 속도 슬라이더를 바꿔봐 🎚️';
      }
      bodyEl.querySelector('#dc-conn').onclick = async () => {
        if (board.connected) return; status.textContent = '연결 중… 포트를 골라주세요 🔌';
        try { await board.connect(); bodyEl.querySelector('#dc-conn').textContent = '🔌 보드 연결됨 ✓'; status.textContent = '버튼으로 실제 13번 LED를 제어해봐!'; }
        catch (e) { status.textContent = board.classify(e).note; }
      };
    }

    function stopBlink() { if (blink) { clearInterval(blink); blink = null; } blinkOn = false; const tg = bodyEl.querySelector('#b-toggle'); if (tg) tg.textContent = '▶ 깜빡이기'; }

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
