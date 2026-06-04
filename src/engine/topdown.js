// topdown.js — 2D 탑다운 엔진 (포켓몬 골드 스타일)
// Canvas 기반. 방향키/WASD 자유 이동 + AABB 충돌 + 접촉 트리거(Space 상호작용).
// EDDIE 는 벡터(SVG)를 래스터화해 아바타로 그린다.
//
// map: {
//   width, height,            // 월드 픽셀 크기
//   bg,                       // 뷰 배경색
//   spawn:{x,y},
//   walls:[{x,y,w,h}],        // 충돌
//   triggers:[{id,x,y,w,h,auto?}],  // 접촉 영역 (auto=진입 시 자동 발동)
//   draw(ctx, state),         // 환경 렌더 (월드 좌표)
// }
// handlers: { onInteract(id,tr), onAuto(id,tr), onFrame(state), onDrawOverlay(ctx,state,canvas) }

import eddieSvg from '../assets/eddie.svg?raw';

const eddieImg = new Image();
eddieImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(eddieSvg);

const MOVE_KEYS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'];

export function createWorld(container, map, handlers = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const state = {
    player: { x: map.spawn.x, y: map.spawn.y, w: 28, h: 30, face: 1, moving: false },
    keys: new Set(),
    paused: false,
    t: 0,
    activeTrigger: null,
    firedAuto: new Set(),
    disabled: new Set(),
    cam: { x: 0, y: 0 },
    tint: null,
    raf: 0,
  };

  function resize() {
    canvas.width = container.clientWidth || window.innerWidth;
    canvas.height = container.clientHeight || window.innerHeight;
  }
  resize();
  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  function onKey(e, down) {
    if (state.paused) return;             // 일시정지(룸 패널 등) 중엔 입력 가로채지 않음 → 에디터 타이핑 보호
    const k = e.key.toLowerCase();
    if (MOVE_KEYS.includes(k)) {
      e.preventDefault();
      if (down) state.keys.add(k); else state.keys.delete(k);
    }
    if (down && (k === ' ' || k === 'enter')) { e.preventDefault(); interact(); }
  }
  const kd = (e) => onKey(e, true);
  const ku = (e) => onKey(e, false);
  window.addEventListener('keydown', kd);
  window.addEventListener('keyup', ku);

  // EDDIE 클릭 → 랜덤 대사 콜백
  const onPointer = (e) => {
    if (state.paused) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left + state.cam.x;
    const my = e.clientY - rect.top + state.cam.y;
    const p = state.player;
    if (mx >= p.x - 14 && mx <= p.x + p.w + 14 && my >= p.y - 46 && my <= p.y + p.h + 4) handlers.onEddieClick?.();
  };
  canvas.addEventListener('pointerdown', onPointer);

  function interact() {
    if (state.paused) return;
    const tr = state.activeTrigger;
    if (tr && !tr.auto && !state.disabled.has(tr.id)) handlers.onInteract?.(tr.id, tr);
  }

  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function moveAxis(dx, dy) {
    const p = state.player;
    const walls = map.walls || [];
    const bx = { x: p.x + dx, y: p.y, w: p.w, h: p.h };
    if (!walls.some((w) => overlap(bx, w))) p.x += dx;
    const by = { x: p.x, y: p.y + dy, w: p.w, h: p.h };
    if (!walls.some((w) => overlap(by, w))) p.y += dy;
    p.x = Math.max(0, Math.min((map.width || canvas.width) - p.w, p.x));
    p.y = Math.max(0, Math.min((map.height || canvas.height) - p.h, p.y));
  }

  function update() {
    const p = state.player;
    if (!state.paused) {
      const sp = 2.6;
      let dx = 0, dy = 0;
      if (state.keys.has('arrowleft') || state.keys.has('a')) dx -= sp;
      if (state.keys.has('arrowright') || state.keys.has('d')) dx += sp;
      if (state.keys.has('arrowup') || state.keys.has('w')) dy -= sp;
      if (state.keys.has('arrowdown') || state.keys.has('s')) dy += sp;
      if (dx && dy) { dx *= 0.707; dy *= 0.707; }
      p.moving = !!(dx || dy);
      if (dx < 0) p.face = -1; else if (dx > 0) p.face = 1;
      moveAxis(dx, dy);

      const pc = { x: p.x, y: p.y, w: p.w, h: p.h };
      let active = null;
      for (const tr of map.triggers || []) {
        if (state.disabled.has(tr.id)) continue;
        if (overlap(pc, tr)) {
          if (tr.auto) {
            if (!state.firedAuto.has(tr.id)) { state.firedAuto.add(tr.id); handlers.onAuto?.(tr.id, tr); }
          } else active = tr;
        } else if (tr.auto) {
          state.firedAuto.delete(tr.id);
        }
      }
      state.activeTrigger = active;
      state.t += 1;
    }
  }

  function camera() {
    const vw = canvas.width, vh = canvas.height;
    const mw = map.width || vw, mh = map.height || vh;
    let cx = state.player.x + state.player.w / 2 - vw / 2;
    let cy = state.player.y + state.player.h / 2 - vh / 2;
    cx = mw <= vw ? (mw - vw) / 2 : Math.max(0, Math.min(mw - vw, cx));
    cy = mh <= vh ? (mh - vh) / 2 : Math.max(0, Math.min(mh - vh, cy));
    state.cam.x = cx; state.cam.y = cy;
  }

  function drawPlayer() {
    const p = state.player;
    const bob = p.moving ? Math.abs(Math.sin(state.t * 0.25)) * 4 : Math.sin(state.t * 0.05) * 1.5;
    const dw = 44, dh = 58;
    const cx = p.x + p.w / 2, feet = p.y + p.h;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(cx, feet - 2, 17, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (eddieImg.complete && eddieImg.naturalWidth) {
      ctx.save();
      ctx.translate(cx, feet - dh + bob);
      if (p.face < 0) ctx.scale(-1, 1);
      ctx.drawImage(eddieImg, -dw / 2, 0, dw, dh);
      if (state.tint) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = state.tint;
        ctx.fillRect(-dw / 2, 0, dw, dh);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
    } else {
      ctx.fillStyle = '#f7b125';
      ctx.fillRect(cx - 14, feet - 48, 28, 48);
    }
  }

  function draw() {
    const vw = canvas.width, vh = canvas.height;
    ctx.fillStyle = map.bg || '#0b1322';
    ctx.fillRect(0, 0, vw, vh);
    ctx.save();
    ctx.translate(-state.cam.x, -state.cam.y);
    map.draw?.(ctx, state);
    drawPlayer();
    ctx.restore();
    handlers.onDrawOverlay?.(ctx, state, canvas);
    handlers.onFrame?.(state);
  }

  function loop() {
    update();
    camera();
    draw();
    state.raf = requestAnimationFrame(loop);
  }
  state.raf = requestAnimationFrame(loop);

  return {
    state,
    get player() { return state.player; },
    get activeTrigger() { return state.activeTrigger; },
    pause() { state.paused = true; state.keys.clear(); },
    resume() { state.paused = false; },
    setTint(c) { state.tint = c; },
    disableTrigger(id) { state.disabled.add(id); },
    enableTrigger(id) { state.disabled.delete(id); },
    teleport(x, y) { state.player.x = x; state.player.y = y; },
    destroy() {
      cancelAnimationFrame(state.raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      canvas.removeEventListener('pointerdown', onPointer);
      canvas.remove();
    },
  };
}
