// dht11room.js — DHT-11 학습방(컨텐츠 + 미션). 실시간 온습도 모니터링(반응형 배경)
// + 방 미션: 동그란 3개 구역(더움/추움/불쾌)에서 배터리 3개를 모으면 방 클리어.
// 게임(쾌적 지키기)은 가운데 [게임하기]로 별도 진행. ✎코드 수정 / 복도 나가기.

import { createWorld } from '../engine/topdown.js';
import { board } from '../app/board.js';
import { progress } from '../app/progress.js';
import { mountSay, eddieRandom } from '../app/eddieSay.js';

const MAP_W = 960, MAP_H = 620;
const ZONES = {
  bat0: { x: 150, y: 224, w: 96, h: 96, cx: 198, cy: 272, name: '더움', icon: '🔥', color: '255,90,40' },
  bat1: { x: 432, y: 150, w: 96, h: 96, cx: 480, cy: 198, name: '추움', icon: '❄️', color: '90,150,255' },
  bat2: { x: 714, y: 224, w: 96, h: 96, cx: 762, cy: 272, name: '불쾌', icon: '😣', color: '200,60,180' },
};
const PLAY = { x: 446, y: 430, w: 70, h: 70 };
const EXIT = { x: 448, y: MAP_H - 56, w: 64, h: 38 };

export function showDht11Room(root, { onPlay, onExit, onCode } = {}) {
  const cur = { temp: 24, hum: 50, real: false };
  const got = { bat0: false, bat1: false, bat2: false };
  let pollTimer = null, nullCount = 0, updating = false, simPhase = 0, cleared = progress.isCleared('dht11');

  root.innerHTML = `
    <div class="scene game-scene scene-fade">
      <div class="world-host" id="world-host"></div>
      <div class="hud-top">
        <div class="brand"><span class="brand-dot"></span><strong>Eduino AI</strong><span class="brand-sep">:</span><b class="brand-sub">DHT-11</b><span class="crumb">2. 모니터링 · 미션</span></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm" id="rm-code">✎ 코드 수정</button>
          <button class="btn btn-sm" id="rm-exit">🚪 복도로</button>
        </div>
      </div>
      <div class="dht-hud" id="dht-hud">
        <div class="dh-item"><span class="dh-ic">🌡️</span><b id="dh-t">--</b>℃</div>
        <div class="dh-item"><span class="dh-ic">💧</span><b id="dh-h">--</b>%</div>
        <div class="dh-di" id="dh-di">불쾌지수 --</div>
        <div class="dh-mission" id="dh-mission">🔋 0 / 3</div>
        <div class="dh-src" id="dh-src">연결 확인 중…</div>
        <button class="btn btn-sm dh-update" id="dh-update" hidden>🔄 펌웨어 v2</button>
      </div>
      <div class="hud-hint" id="hud-hint"></div>
      <div class="hud-toast" id="hud-toast"></div>
      <div class="hud-narrate" id="hud-narrate"></div>
      <div class="hud-controls">⬆⬇⬅➡ 이동 · Space · 배터리 3개 모으기! · EDDIE 클릭</div>
    </div>`;

  const hintEl = root.querySelector('#hud-hint');
  const toastEl = root.querySelector('#hud-toast');
  const narrateEl = root.querySelector('#hud-narrate');
  const say = mountSay(root.querySelector('.game-scene'));
  root.querySelector('#rm-exit').onclick = () => { cleanup(); onExit?.(); };
  root.querySelector('#rm-code').onclick = () => { cleanup(); onCode?.(); };

  const map = {
    width: MAP_W, height: MAP_H, bg: '#0a1422',
    spawn: { x: 480, y: 540 },
    walls: [
      { x: 0, y: 0, w: MAP_W, h: 24 }, { x: 0, y: MAP_H - 24, w: MAP_W, h: 24 },
      { x: 0, y: 0, w: 24, h: MAP_H }, { x: MAP_W - 24, y: 0, w: 24, h: MAP_H },
      { x: 360, y: 40, w: 240, h: 34 },
    ],
    triggers: [
      ...Object.entries(ZONES).map(([id, z]) => ({ id, x: z.x, y: z.y, w: z.w, h: z.h })),
      { id: 'play', ...PLAY }, { id: 'exit', ...EXIT },
    ],
    draw: (ctx) => drawRoom(ctx, got, cleared),
  };

  const world = createWorld(root.querySelector('#world-host'), map, {
    onEddieClick: () => say(eddieRandom()),
    onInteract: (id) => {
      if (id === 'play') { cleanup(); onPlay?.(); }
      else if (id === 'exit') { cleanup(); onExit?.(); }
      else if (ZONES[id]) collect(id);
    },
    onFrame: (st) => {
      const tr = st.activeTrigger;
      if (!tr) { hintEl.classList.remove('show'); }
      else {
        if (tr.id === 'play') hintEl.innerHTML = '🎮 Space · 게임하기 (쾌적 지키기)';
        else if (tr.id === 'exit') hintEl.innerHTML = '🚪 Space · 복도로';
        else if (ZONES[tr.id]) hintEl.innerHTML = got[tr.id] ? `${ZONES[tr.id].name} 배터리 — 획득함 ✅` : `🔋 Space · ${ZONES[tr.id].icon} ${ZONES[tr.id].name} 배터리 줍기`;
        hintEl.classList.add('show');
      }
      // EDDIE 색감: 위치한 구역 색
      let tint = null;
      const px = st.player.x + st.player.w / 2, py = st.player.y + st.player.h / 2;
      for (const z of Object.values(ZONES)) { const dx = px - z.cx, dy = py - z.cy; if (dx * dx + dy * dy < 60 * 60) tint = `rgba(${z.color},0.45)`; }
      world.setTint(tint);
    },
    onDrawOverlay: drawReactive,
  });

  setTimeout(() => narrate('동그란 3개 구역에서 배터리를 모아 미션을 클리어하자! 🔋'), 400);

  function collect(id) {
    if (got[id]) { toast(`${ZONES[id].name} 배터리는 이미 가졌어요`); return; }
    got[id] = true; world.disableTrigger(id);
    const n = Object.values(got).filter(Boolean).length;
    set('#dh-mission', `🔋 ${n} / 3`);
    toast(`${ZONES[id].icon} ${ZONES[id].name} 배터리 획득! (${n}/3)`);
    if (n >= 3) {
      cleared = true; progress.mark('dht11');
      narrate('배터리 3개 모두 획득! DHT-11 방 미션 클리어 🎉 복도에 ✓ 표시가 붙어요.');
      toast('🎉 방 미션 클리어! (배터리 3/3)');
    }
  }

  // ---- 센서 폴링 ----
  async function poll() {
    if (updating) return;
    if (board.connected) {
      const r = await board.readDht();
      if (r) { cur.temp = r.temp; cur.hum = r.hum; cur.real = true; nullCount = 0; root.querySelector('#dh-update').hidden = true; updateHud(); return; }
      if (++nullCount >= 2) root.querySelector('#dh-update').hidden = false;
    }
    cur.real = false; simPhase += 1;
    cur.temp = clamp(24 + Math.sin(simPhase / 8) * 9 + (Math.random() - 0.5), 0, 45);
    cur.hum = clamp(52 + Math.sin(simPhase / 6 + 1) * 22 + (Math.random() - 0.5), 0, 100);
    updateHud();
  }
  pollTimer = setInterval(poll, 1500); poll();

  root.querySelector('#dh-update').onclick = async () => {
    if (updating || !board.connected) { if (!board.connected) toast('먼저 사용환경 준비에서 보드를 연결하세요.'); return; }
    updating = true; const btn = root.querySelector('#dh-update'); btn.disabled = true;
    toast('펌웨어 v2 굽는 중… 케이블 뽑지 마세요!');
    try {
      const r = await board.flash({ onProgress: (d, t) => toast(`펌웨어 굽는 중… ${Math.round((d / t) * 100)}%`) });
      if (r && r.ok) { toast('업데이트 완료! 실시간 온습도가 읽힙니다 🎉'); nullCount = 0; btn.hidden = true; }
      else toast('업데이트 실패 — 케이블/포트를 확인하세요.');
    } catch (e) { toast('업데이트 실패: ' + (e?.message ?? e)); }
    updating = false; btn.disabled = false;
  };

  function updateHud() {
    set('#dh-t', Math.round(cur.temp)); set('#dh-h', Math.round(cur.hum));
    const di = discomfort(cur.temp, cur.hum);
    const diEl = root.querySelector('#dh-di');
    if (diEl) { diEl.textContent = `불쾌지수 ${Math.round(di)}`; diEl.className = 'dh-di' + (di >= 80 ? ' bad' : di >= 75 ? ' warn' : ''); }
    const src = root.querySelector('#dh-src');
    if (src) { src.textContent = cur.real ? '● 실시간(DHT11)' : '○ 시뮬레이션'; src.className = 'dh-src' + (cur.real ? ' live' : ''); }
  }

  function set(sel, v) { const el = root.querySelector(sel); if (el) el.textContent = v; }
  let tT = null, nT = null;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => toastEl.classList.remove('show'), 2400); }
  function narrate(t) { narrateEl.innerHTML = `<span>🤖 ${t}</span>`; narrateEl.classList.add('show'); clearTimeout(nT); nT = setTimeout(() => narrateEl.classList.remove('show'), 4200); }
  function cleanup() { clearInterval(pollTimer); try { world.destroy(); } catch (_) {} }

  function drawReactive(ctx, st, canvas) {
    const W = canvas.width, H = canvas.height, t = cur.temp, h = cur.hum;
    const heat = clamp((t - 25) / 9, 0, 1), cold = clamp((20 - t) / 9, 0, 1), damp = clamp((h - 55) / 25, 0, 1), dry = clamp((35 - h) / 22, 0, 1);
    const disc = clamp((discomfort(t, h) - 72) / 12, 0, 1);
    if (heat > 0) { ctx.fillStyle = `rgba(255,90,30,${0.10 + 0.30 * heat})`; ctx.fillRect(0, 0, W, H); ctx.fillStyle = `rgba(255,170,70,${0.10 * heat})`; for (let i = 0; i < 4; i++) { const y = H - (st.t * 0.6 + i * 90) % (H + 90); ctx.fillRect(0, y, W, 26); } }
    if (cold > 0) { ctx.fillStyle = `rgba(120,180,255,${0.10 + 0.26 * cold})`; ctx.fillRect(0, 0, W, H); }
    if (dry > 0) { ctx.fillStyle = `rgba(210,180,120,${0.16 * dry})`; ctx.fillRect(0, 0, W, H); }
    if (damp > 0) { ctx.fillStyle = `rgba(40,120,200,${0.10 + 0.24 * damp})`; ctx.fillRect(0, 0, W, H); ctx.fillStyle = `rgba(190,225,255,${0.5 * damp})`; for (let i = 0; i < 26; i++) { const x = (i * 73 + 30) % W; const y = ((st.t * 2.4) + i * 130) % (H + 60); ctx.fillRect(x, y, 2, 11); } }
    if (disc > 0.3) { const pulse = 0.16 + 0.12 * Math.sin(st.t * 0.12); const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(220,30,120,${pulse * disc})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  }
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function discomfort(t, h) { return 0.81 * t + 0.01 * h * (0.99 * t - 14.3) + 46.3; }

function drawRoom(ctx, got, cleared) {
  ctx.fillStyle = '#22304a'; ctx.fillRect(0, 0, MAP_W, MAP_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
  for (let x = 0; x < MAP_W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_H); ctx.stroke(); }
  for (let y = 0; y < MAP_H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_W, y); ctx.stroke(); }
  ctx.fillStyle = '#2b3552'; ctx.fillRect(0, 0, MAP_W, 24); ctx.fillRect(0, MAP_H - 24, MAP_W, 24); ctx.fillRect(0, 0, 24, MAP_H); ctx.fillRect(MAP_W - 24, 0, 24, MAP_H);
  // 센서 모니터 책상
  ctx.fillStyle = '#5a4a32'; rr(ctx, 360, 40, 240, 34, 6); ctx.fill();
  ctx.fillStyle = '#0e1726'; rr(ctx, 410, 30, 140, 14, 4); ctx.fill();

  ctx.textAlign = 'center';
  // 배터리 구역
  for (const [k, z] of Object.entries(ZONES)) {
    const has = !got[k];
    const g = ctx.createRadialGradient(z.cx, z.cy, 0, z.cx, z.cy, 64);
    g.addColorStop(0, `rgba(${z.color},0.45)`); g.addColorStop(1, `rgba(${z.color},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(z.cx, z.cy, 64, 0, 6.283); ctx.fill();
    ctx.strokeStyle = `rgba(${z.color},0.9)`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(z.cx, z.cy, 48, 0, 6.283); ctx.stroke();
    ctx.font = '34px sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(has ? '🔋' : '✅', z.cx, z.cy + 12);
    ctx.fillStyle = '#cfe0ff'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(`${z.icon} ${z.name}`, z.cx, z.cy + 44);
  }
  // 게임하기 받침대
  const px = PLAY.x + PLAY.w / 2, py = PLAY.y + PLAY.h / 2;
  const pg = ctx.createRadialGradient(px, py, 0, px, py, 70); pg.addColorStop(0, 'rgba(111,183,255,0.4)'); pg.addColorStop(1, 'rgba(111,183,255,0)');
  ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, 70, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#2a3a66'; rr(ctx, PLAY.x, PLAY.y + 18, PLAY.w, PLAY.h - 18, 10); ctx.fill();
  ctx.fillStyle = '#6fb7ff'; ctx.font = '26px sans-serif'; ctx.fillText('🎮', px, py + 10);
  ctx.fillStyle = '#cfe0ff'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('게임하기 ▸', px, py + 46);
  // 나가기
  ctx.fillStyle = '#5a3a2a'; rr(ctx, EXIT.x - 6, MAP_H - 28, EXIT.w + 12, 24, 5); ctx.fill();
  ctx.fillStyle = '#caa15a'; rr(ctx, EXIT.x, MAP_H - 24, EXIT.w, 18, 4); ctx.fill();
  ctx.fillStyle = '#cfe0ff'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('🚪 복도로', EXIT.x + EXIT.w / 2, MAP_H - 36);
  if (cleared) { ctx.fillStyle = '#3ddc91'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('✓ 미션 클리어', 480, 470); }
  ctx.textAlign = 'start';
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
