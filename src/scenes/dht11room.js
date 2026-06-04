// dht11room.js — DHT-11 학습방 2단계: 실시간 온습도 모니터링 방 (컨텐츠).
// 실물 센서값을 스트리밍(폴링)해 게이지/수치 표시. 온도↑ 더운 연출, 습도↑ 축축,
// 둘 다↑ 불쾌지수 폭발로 화면이 변한다. 가운데 [게임하기] 지점 → 미니게임.

import { createWorld } from '../engine/topdown.js';
import { board } from '../app/board.js';

const MAP_W = 960, MAP_H = 620;
const PLAY = { x: 446, y: 286, w: 70, h: 70 };       // 게임하기 지점
const EXIT = { x: 448, y: MAP_H - 58, w: 64, h: 38 };

export function showDht11Room(root, { onPlay, onExit } = {}) {
  const cur = { temp: 24, hum: 50, real: false };
  let pollTimer = null, nullCount = 0, warned = false;

  root.innerHTML = `
    <div class="scene game-scene scene-fade">
      <div class="world-host" id="world-host"></div>
      <div class="hud-top">
        <div class="brand"><span class="brand-dot"></span><strong>Eduino AI</strong><span class="brand-sep">:</span><b class="brand-sub">DHT-11</b><span class="crumb">2. 모니터링</span></div>
        <button class="btn btn-sm" id="rm-exit">🚪 복도로</button>
      </div>
      <div class="dht-hud" id="dht-hud">
        <div class="dh-item"><span class="dh-ic">🌡️</span><b id="dh-t">--</b>℃</div>
        <div class="dh-item"><span class="dh-ic">💧</span><b id="dh-h">--</b>%</div>
        <div class="dh-di" id="dh-di">불쾌지수 --</div>
        <div class="dh-src" id="dh-src">연결 확인 중…</div>
      </div>
      <div class="hud-hint" id="hud-hint"></div>
      <div class="hud-toast" id="hud-toast"></div>
      <div class="hud-controls">⬆⬇⬅➡ 이동 · Space · 가운데 [게임하기]</div>
    </div>`;

  const hintEl = root.querySelector('#hud-hint');
  const toastEl = root.querySelector('#hud-toast');
  root.querySelector('#rm-exit').onclick = () => { cleanup(); onExit?.(); };

  const map = {
    width: MAP_W, height: MAP_H, bg: '#0a1422',
    spawn: { x: 480, y: 470 },
    walls: [
      { x: 0, y: 0, w: MAP_W, h: 24 }, { x: 0, y: MAP_H - 24, w: MAP_W, h: 24 },
      { x: 0, y: 0, w: 24, h: MAP_H }, { x: MAP_W - 24, y: 0, w: 24, h: MAP_H },
      { x: 360, y: 60, w: 240, h: 40 },   // 상단 책상(충돌)
    ],
    triggers: [{ id: 'play', ...PLAY }, { id: 'exit', ...EXIT }],
    draw: drawRoom,
  };

  const world = createWorld(root.querySelector('#world-host'), map, {
    onInteract: (id) => { if (id === 'play') { cleanup(); onPlay?.(); } else if (id === 'exit') { cleanup(); onExit?.(); } },
    onFrame: (st) => {
      const tr = st.activeTrigger;
      if (!tr) { hintEl.classList.remove('show'); return; }
      hintEl.innerHTML = tr.id === 'play' ? '🎮 Space · <b>게임하기</b>' : '🚪 Space · 복도로';
      hintEl.classList.add('show');
    },
    onDrawOverlay: drawReactive,
  });

  // 센서 폴링(실물) / 미연결 시 시뮬레이션
  async function poll() {
    if (board.connected) {
      const r = await board.readDht();
      if (r) { cur.temp = r.temp; cur.hum = r.hum; cur.real = true; nullCount = 0; updateHud(); return; }
      if (++nullCount >= 2 && !warned) { warned = true; toast('DHT 미응답 — 사용환경 준비에서 펌웨어를 다시 구워보세요(v2 필요).'); }
    }
    cur.real = false;
    cur.temp = clamp(cur.temp + (Math.random() - 0.5) * 0.8, 0, 45);
    cur.hum = clamp(cur.hum + (Math.random() - 0.5) * 1.2, 0, 100);
    updateHud();
  }
  pollTimer = setInterval(poll, 1500);
  poll();

  function updateHud() {
    set('#dh-t', Math.round(cur.temp)); set('#dh-h', Math.round(cur.hum));
    const di = discomfort(cur.temp, cur.hum);
    const diEl = root.querySelector('#dh-di');
    if (diEl) { diEl.textContent = `불쾌지수 ${Math.round(di)}`; diEl.className = 'dh-di' + (di >= 80 ? ' bad' : di >= 75 ? ' warn' : ''); }
    const src = root.querySelector('#dh-src');
    if (src) { src.textContent = cur.real ? '● 실시간(DHT11)' : '○ 시뮬레이션'; src.className = 'dh-src' + (cur.real ? ' live' : ''); }
  }

  function set(sel, v) { const el = root.querySelector(sel); if (el) el.textContent = v; }

  let tT = null;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => toastEl.classList.remove('show'), 3000); }
  function cleanup() { clearInterval(pollTimer); try { world.destroy(); } catch (_) {} }

  // ---- 반응형 배경 연출 ----
  function drawReactive(ctx, st, canvas) {
    const W = canvas.width, H = canvas.height, t = cur.temp, h = cur.hum;
    const heat = clamp((t - 26) / 12, 0, 1);
    const cold = clamp((18 - t) / 12, 0, 1);
    const damp = clamp((h - 60) / 35, 0, 1);
    const di = discomfort(t, h);
    const disc = clamp((di - 75) / 13, 0, 1);

    if (heat > 0) { ctx.fillStyle = `rgba(255,90,30,${0.30 * heat})`; ctx.fillRect(0, 0, W, H);
      // 열기 아지랑이
      ctx.fillStyle = `rgba(255,160,60,${0.10 * heat})`;
      for (let i = 0; i < 4; i++) { const y = H - (st.t * 0.6 + i * 90) % (H + 90); ctx.fillRect(0, y, W, 26); }
    }
    if (cold > 0) { ctx.fillStyle = `rgba(120,180,255,${0.30 * cold})`; ctx.fillRect(0, 0, W, H); }
    if (damp > 0) {
      ctx.fillStyle = `rgba(40,120,200,${0.28 * damp})`; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `rgba(180,220,255,${0.5 * damp})`;
      for (let i = 0; i < 24; i++) { const x = (i * 73 + 30) % W; const y = ((st.t * 2.2) + i * 130) % (H + 60); ctx.fillRect(x, y, 2, 10); }
    }
    if (disc > 0.35) {
      const pulse = 0.18 + 0.12 * Math.sin(st.t * 0.12);
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(220,30,120,${(pulse) * disc})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (disc > 0.7) { ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🥵 불쾌지수 폭발!', W / 2, 130); ctx.textAlign = 'start'; }
    }
  }
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function discomfort(t, h) { return 0.81 * t + 0.01 * h * (0.99 * t - 14.3) + 46.3; }

function drawRoom(ctx) {
  // 바닥
  ctx.fillStyle = '#22304a'; ctx.fillRect(0, 0, MAP_W, MAP_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
  for (let x = 0; x < MAP_W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_H); ctx.stroke(); }
  for (let y = 0; y < MAP_H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_W, y); ctx.stroke(); }
  // 벽
  ctx.fillStyle = '#2b3552'; ctx.fillRect(0, 0, MAP_W, 24); ctx.fillRect(0, MAP_H - 24, MAP_W, 24); ctx.fillRect(0, 0, 24, MAP_H); ctx.fillRect(MAP_W - 24, 0, 24, MAP_H);
  // 책상 + 센서 모니터(상단)
  ctx.fillStyle = '#5a4a32'; rr(ctx, 360, 70, 240, 34, 6); ctx.fill();
  ctx.fillStyle = '#0e1726'; rr(ctx, 410, 36, 140, 40, 6); ctx.fill();
  ctx.fillStyle = '#1f6f8b'; rr(ctx, 416, 42, 128, 28, 4); ctx.fill();
  ctx.fillStyle = '#bfe6ff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SENSOR', 480, 60);
  // 게임하기 받침대
  const px = PLAY.x + PLAY.w / 2, py = PLAY.y + PLAY.h / 2;
  const g = ctx.createRadialGradient(px, py, 0, px, py, 80); g.addColorStop(0, 'rgba(111,183,255,0.4)'); g.addColorStop(1, 'rgba(111,183,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, 80, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#2a3a66'; rr(ctx, PLAY.x, PLAY.y + 20, PLAY.w, PLAY.h - 20, 10); ctx.fill();
  ctx.fillStyle = '#6fb7ff'; ctx.font = '28px sans-serif'; ctx.fillText('🎮', px, py + 14);
  ctx.fillStyle = '#cfe0ff'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('게임하기 ▸', px, py + 50);
  // 화분
  ctx.fillStyle = '#2a6e3f'; ctx.beginPath(); ctx.arc(120, 480, 18, 0, 6.283); ctx.fill(); ctx.fillStyle = '#7a5230'; ctx.fillRect(112, 492, 16, 16);
  ctx.beginPath(); ctx.fillStyle = '#2a6e3f'; ctx.arc(840, 480, 18, 0, 6.283); ctx.fill(); ctx.fillStyle = '#7a5230'; ctx.fillRect(832, 492, 16, 16);
  // 나가기
  ctx.fillStyle = '#5a3a2a'; rr(ctx, EXIT.x - 6, MAP_H - 28, EXIT.w + 12, 24, 5); ctx.fill();
  ctx.fillStyle = '#caa15a'; rr(ctx, EXIT.x, MAP_H - 24, EXIT.w, 18, 4); ctx.fill();
  ctx.fillStyle = '#cfe0ff'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('🚪 복도로', EXIT.x + EXIT.w / 2, MAP_H - 36);
  ctx.textAlign = 'start';
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
