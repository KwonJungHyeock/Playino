// dht11.js — DHT-11 미니게임 "배터리 구출"
// EDDIE가 배터리를 가지러 가는 길에 3개 기후 구역(더움🔥/추움❄️/불쾌😣)이 막고 있다.
// 각 구역 앞 장치에서 해소(냉방/난방/환기)해야 안전하게 통과. 해소 안 하고 들어가면
// EDDIE 고장 → 재시도. 3구역 통과 후 배터리 획득 → 클리어.

import { createWorld } from '../engine/topdown.js';
import { progress } from '../app/progress.js';
import { mountSay, eddieRandom } from '../app/eddieSay.js';

const MAP_W = 900, MAP_H = 640;
const BANDS = {
  A: { rect: { x: 24, y: 430, w: 852, h: 60 }, pad: { x: 410, y: 502, w: 80, h: 34 }, name: '더움', icon: '🔥', fix: '❄️ 냉방', color: '255,90,40' },
  B: { rect: { x: 24, y: 280, w: 852, h: 60 }, pad: { x: 410, y: 352, w: 80, h: 34 }, name: '추움', icon: '❄️', fix: '🔥 난방', color: '90,150,255' },
  C: { rect: { x: 24, y: 130, w: 852, h: 60 }, pad: { x: 410, y: 202, w: 80, h: 34 }, name: '불쾌', icon: '😣', fix: '💨 환기', color: '200,60,180' },
};
const BATTERY = { x: 418, y: 44, w: 64, h: 60 };

export function showDht11(root, { onQuit } = {}) {
  const resolved = { A: false, B: false, C: false };

  root.innerHTML = `
    <div class="scene game-scene scene-fade dht-game">
      <div class="world-host" id="world-host"></div>
      <div class="hud-top">
        <div class="brand"><span class="brand-dot"></span><strong>Eduino AI</strong><span class="brand-sep">:</span><b class="brand-sub">DHT-11</b><span class="crumb">배터리 구출</span></div>
        <button class="btn btn-sm" id="dg-quit">⏹ 그만두기</button>
      </div>
      <div class="hud-hint" id="hud-hint"></div>
      <div class="hud-toast" id="hud-toast"></div>
      <div class="hud-controls">⬆⬇⬅➡ 이동 · Space · 구역 앞에서 해소 후 통과!</div>
    </div>`;

  const hintEl = root.querySelector('#hud-hint');
  const toastEl = root.querySelector('#hud-toast');
  const say = mountSay(root.querySelector('.game-scene'));
  root.querySelector('#dg-quit').onclick = () => { world.destroy(); onQuit?.(); };

  const map = {
    width: MAP_W, height: MAP_H, bg: '#0a1422',
    spawn: { x: 436, y: 556 },
    walls: [
      { x: 0, y: 0, w: MAP_W, h: 24 }, { x: 0, y: MAP_H - 24, w: MAP_W, h: 24 },
      { x: 0, y: 0, w: 24, h: MAP_H }, { x: MAP_W - 24, y: 0, w: 24, h: MAP_H },
    ],
    triggers: [
      { id: 'bandA', ...BANDS.A.rect, auto: true }, { id: 'bandB', ...BANDS.B.rect, auto: true }, { id: 'bandC', ...BANDS.C.rect, auto: true },
      { id: 'padA', ...BANDS.A.pad }, { id: 'padB', ...BANDS.B.pad }, { id: 'padC', ...BANDS.C.pad },
      { id: 'battery', ...BATTERY },
    ],
    draw: (ctx) => drawGame(ctx, resolved),
  };

  const world = createWorld(root.querySelector('#world-host'), map, {
    onEddieClick: () => say(eddieRandom()),
    onAuto: (id) => {
      const k = id.slice(-1);
      if (BANDS[k] && !resolved[k]) fail(k);
    },
    onInteract: (id) => {
      if (id.startsWith('pad')) {
        const k = id.slice(-1);
        if (!resolved[k]) { resolved[k] = true; world.disableTrigger(id); toast(`${BANDS[k].fix} 완료! ${BANDS[k].name} 구역 통과 가능 ✅`); }
      } else if (id === 'battery') {
        if (resolved.A && resolved.B && resolved.C) win();
        else toast('아직 위험 구역이 남았어! 먼저 해소하자.');
      }
    },
    onFrame: (st) => {
      const tr = st.activeTrigger;
      if (tr && tr.id.startsWith('pad')) { const k = tr.id.slice(-1); hintEl.innerHTML = resolved[k] ? `${BANDS[k].name} 해소됨 ✅` : `Space · <b>${BANDS[k].fix}</b>로 ${BANDS[k].name} 해소`; hintEl.classList.add('show'); }
      else if (tr && tr.id === 'battery') { hintEl.innerHTML = '🔋 Space · 배터리 획득!'; hintEl.classList.add('show'); }
      else hintEl.classList.remove('show');
      // EDDIE 색감: 현재 위치한 구역에 따라
      const y = st.player.y + st.player.h / 2;
      let tint = null;
      if (y >= BANDS.A.rect.y && y <= BANDS.A.rect.y + BANDS.A.rect.h) tint = 'rgba(255,90,40,0.45)';
      else if (y >= BANDS.B.rect.y && y <= BANDS.B.rect.y + BANDS.B.rect.h) tint = 'rgba(90,150,255,0.45)';
      else if (y >= BANDS.C.rect.y && y <= BANDS.C.rect.y + BANDS.C.rect.h) tint = 'rgba(200,60,180,0.45)';
      world.setTint(tint);
    },
  });

  let tT = null;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => toastEl.classList.remove('show'), 2200); }

  function fail(k) {
    world.pause();
    overlay(`⚡ EDDIE 고장!`, `${BANDS[k].icon} ${BANDS[k].name} 구역을 해소하지 않고 들어갔어요.<br/>구역 앞 장치에서 <b>${BANDS[k].fix}</b> 한 뒤 통과해야 해요!`,
      [{ label: '다시 시도 ▶', primary: true, act: reset }, { label: '그만두기', act: () => { world.destroy(); onQuit?.(); } }]);
  }
  function reset() {
    resolved.A = resolved.B = resolved.C = false;
    ['padA', 'padB', 'padC'].forEach((id) => world.enableTrigger(id));
    world.teleport(map.spawn.x, map.spawn.y);
    closeOverlay(); world.resume();
  }
  function win() {
    progress.mark('dht11');
    world.pause();
    overlay(`🔋 배터리 획득! 클리어 🎉`, `3개 기후 구역을 모두 해소하고 배터리를 가져왔어요!<br/>온도·습도에 맞춰 환경을 다스리는 게 스마트홈의 핵심이에요.`,
      [{ label: '모니터링 방으로 ▶', primary: true, act: () => { world.destroy(); onQuit?.(); } }, { label: '다시 플레이', act: reset }]);
  }

  let ov = null;
  function overlay(title, html, buttons) {
    ov = document.createElement('div'); ov.className = 'modal-backdrop';
    ov.innerHTML = `<div class="modal"><h3>${title}</h3><p>${html}</p><div class="modal-actions" id="ov-act"></div></div>`;
    document.body.appendChild(ov);
    const act = ov.querySelector('#ov-act');
    buttons.forEach((b) => { const el = document.createElement('button'); el.className = 'btn' + (b.primary ? ' primary' : ''); el.textContent = b.label; el.onclick = b.act; act.appendChild(el); });
  }
  function closeOverlay() { if (ov) { ov.remove(); ov = null; } }
}

function drawGame(ctx, resolved) {
  // 바닥
  ctx.fillStyle = '#16233c'; ctx.fillRect(0, 0, MAP_W, MAP_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
  for (let y = 0; y < MAP_H; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_W, y); ctx.stroke(); }
  // 벽
  ctx.fillStyle = '#2b3552'; ctx.fillRect(0, 0, MAP_W, 24); ctx.fillRect(0, MAP_H - 24, MAP_W, 24); ctx.fillRect(0, 0, 24, MAP_H); ctx.fillRect(MAP_W - 24, 0, 24, MAP_H);

  ctx.textAlign = 'center';
  for (const k of ['A', 'B', 'C']) {
    const b = BANDS[k], r = b.rect, ok = resolved[k];
    ctx.fillStyle = ok ? 'rgba(61,220,145,0.22)' : `rgba(${b.color},0.32)`;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = ok ? 'rgba(61,220,145,0.8)' : `rgba(${b.color},0.9)`; ctx.lineWidth = 2; ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif';
    ctx.fillText(ok ? `✅ ${b.name} 해소 — 통과 OK` : `${b.icon} ${b.name} 구역 — 위험! 먼저 해소`, r.x + r.w / 2, r.y + r.h / 2 + 5);
    // 해소 장치(패드)
    const p = b.pad;
    ctx.fillStyle = ok ? '#2a5a40' : '#2a3a66'; rr(ctx, p.x, p.y, p.w, p.h, 8); ctx.fill();
    ctx.strokeStyle = ok ? '#3ddc91' : '#6fb7ff'; ctx.lineWidth = 2; rr(ctx, p.x, p.y, p.w, p.h, 8); ctx.stroke();
    ctx.fillStyle = '#cfe0ff'; ctx.font = 'bold 13px sans-serif';
    ctx.fillText(ok ? '✓ 완료' : b.fix, p.x + p.w / 2, p.y + p.h / 2 + 5);
  }
  // 배터리
  const g = ctx.createRadialGradient(BATTERY.x + 32, BATTERY.y + 30, 0, BATTERY.x + 32, BATTERY.y + 30, 80);
  g.addColorStop(0, 'rgba(61,220,145,0.4)'); g.addColorStop(1, 'rgba(61,220,145,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(BATTERY.x + 32, BATTERY.y + 30, 80, 0, 6.283); ctx.fill();
  ctx.font = '44px sans-serif'; ctx.fillText('🔋', BATTERY.x + 32, BATTERY.y + 46);
  ctx.fillStyle = '#cfe0ff'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('배터리', BATTERY.x + 32, BATTERY.y + 70);
  ctx.textAlign = 'start';
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
