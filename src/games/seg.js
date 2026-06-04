// seg.js — 봉인 카운트다운(7세그먼트). 방을 잠그는 카운트가 빠르게 흐른다.
// 좌우로 움직이는 표시를 초록 구간에서 STOP! 으로 멈추면 카운트 1 감소. 0이 되면 봉인 해제.
// 라운드마다 구간이 좁아져 난이도↑. 화면 시뮬.
const START = 3;          // 봉인 카운트(3→0)

export function mountSeg(root, ctx) {
  let count = START, pos = 0, dir = 1, speed = 0.9, zoneW = 26, raf = 0, lock = false;

  root.innerHTML = `
    <div class="game seggame">
      <p class="game-lead">⏳ 봉인 카운트가 흐르고 있어요. 표시가 <b>초록 구간</b>에 올 때 STOP! 으로 멈춰 카운트를 0으로 만드세요.</p>
      <div class="seg-display" id="seg-disp">${count}</div>
      <div class="seg-track" id="seg-track">
        <div class="seg-zone" id="seg-zone"></div>
        <div class="seg-marker" id="seg-marker"></div>
      </div>
      <button class="btn primary lg" id="seg-stop">STOP !</button>
      <div class="rgb-status" id="seg-status">초록 구간에서 멈추세요…</div>
    </div>`;

  const disp = root.querySelector('#seg-disp');
  const zoneEl = root.querySelector('#seg-zone');
  const marker = root.querySelector('#seg-marker');
  const stat = root.querySelector('#seg-status');
  const stopBtn = root.querySelector('#seg-stop');
  let zoneCenter = 50;
  placeZone();
  stopBtn.onclick = stop;
  const onKey = (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); stop(); } };
  window.addEventListener('keydown', onKey);
  setTimeout(() => ctx.say?.('초록 구간에 올 때 STOP! 타이밍이 생명이야 ⏱️'), 300);

  loop();
  function loop() {
    if (!lock) { pos += dir * speed; if (pos >= 100) { pos = 100; dir = -1; } else if (pos <= 0) { pos = 0; dir = 1; } marker.style.left = pos + '%'; }
    raf = requestAnimationFrame(loop);
  }
  function placeZone() { zoneCenter = 18 + Math.random() * 64; zoneEl.style.left = (zoneCenter - zoneW / 2) + '%'; zoneEl.style.width = zoneW + '%'; }

  function stop() {
    if (lock) return;
    const hit = Math.abs(pos - zoneCenter) <= zoneW / 2;
    lock = true;
    if (hit) {
      count--; disp.textContent = count; flash(true);
      if (count <= 0) { stat.textContent = '🔓 봉인 해제 — 카운트 0!'; stat.classList.add('ok'); cancelAnimationFrame(raf); ctx.onComplete?.(); return; }
      stat.textContent = `좋아요! 남은 카운트 ${count} (구간이 좁아져요)`;
      speed += 0.35; zoneW = Math.max(14, zoneW - 4);
      setTimeout(() => { placeZone(); lock = false; }, 600);
    } else {
      flash(false); stat.textContent = '❌ 빗나감 — 구간 밖! 다시'; stat.classList.remove('near');
      setTimeout(() => { lock = false; }, 500);
    }
  }
  function flash(ok) { disp.classList.remove('ok', 'bad'); void disp.offsetWidth; disp.classList.add(ok ? 'ok' : 'bad'); }

  return { destroy() { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); } };
}
