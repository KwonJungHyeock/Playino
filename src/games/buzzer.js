// buzzer.js — 경보 해제(부저). 울리는 경보의 멜로디 시퀀스를 듣고 그대로 재현(사이먼).
// 라운드마다 한 음씩 길어지고, 목표 길이에 도달하면 경보 정지 → 클리어.
// 소리는 WebAudio로 시뮬(보드 tone 명령은 펌웨어 미지원 → 화면/소리 시뮬).
const PADS = [
  { f: 392, c: '#ff6b6b' }, { f: 494, c: '#ffd24a' },
  { f: 587, c: '#5ad17a' }, { f: 740, c: '#5a9bff' },
];
const GOAL = 5;   // 이 길이까지 재현하면 해제

export function mountBuzzer(root, ctx) {
  let seq = [], input = [], lock = true, ac = null;

  root.innerHTML = `
    <div class="game buzzergame">
      <p class="game-lead">🚨 경보가 울려요! <b>멜로디 시퀀스</b>를 잘 듣고 같은 순서로 눌러 경보를 끄세요. (${GOAL}음)</p>
      <div class="bz-pads">${PADS.map((p, i) => `<button class="bz-pad" data-i="${i}" style="--pc:${p.c}"></button>`).join('')}</div>
      <div class="bz-row">
        <div class="bz-progress" id="bz-prog">길이 0 / ${GOAL}</div>
        <button class="btn" id="bz-replay">🔁 다시 듣기</button>
      </div>
      <div class="rgb-status" id="bz-status">시작하면 경보 멜로디가 흘러나와요…</div>
    </div>`;

  const pads = [...root.querySelectorAll('.bz-pad')];
  const prog = root.querySelector('#bz-prog');
  const stat = root.querySelector('#bz-status');
  pads.forEach((b) => (b.onclick = () => press(+b.dataset.i)));
  root.querySelector('#bz-replay').onclick = () => { if (!lock) playSeq(); };

  function audio() { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume().catch(() => {}); return ac; }
  function beep(f, ms = 280) {
    try { const a = audio(); const o = a.createOscillator(), g = a.createGain();
      o.type = 'square'; o.frequency.value = f; o.connect(g); g.connect(a.destination);
      g.gain.setValueAtTime(0.0001, a.currentTime); g.gain.exponentialRampToValueAtTime(0.18, a.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + ms / 1000);
      o.start(); o.stop(a.currentTime + ms / 1000 + 0.02);
    } catch (_) {}
  }
  function flash(i, ms = 280) { pads[i].classList.add('lit'); beep(PADS[i].f, ms); setTimeout(() => pads[i].classList.remove('lit'), ms); }

  function nextRound() { seq.push((Math.random() * 4) | 0); input = []; prog.textContent = `길이 ${seq.length - 1} / ${GOAL}`; stat.textContent = '잘 들어요…'; playSeq(); }
  function playSeq() {
    lock = true; let k = 0;
    const step = () => { if (k >= seq.length) { lock = false; stat.textContent = '이제 같은 순서로 눌러요!'; return; } flash(seq[k]); k++; setTimeout(step, 460); };
    setTimeout(step, 420);
  }
  function press(i) {
    if (lock) return;
    flash(i, 180); input.push(i);
    const idx = input.length - 1;
    if (input[idx] !== seq[idx]) { stat.textContent = '❌ 시퀀스 불일치 — 다시!'; stat.classList.remove('near'); lock = true; setTimeout(() => { input = []; playSeq(); }, 700); return; }
    if (input.length === seq.length) {
      prog.textContent = `길이 ${seq.length} / ${GOAL}`;
      if (seq.length >= GOAL) { win(); return; }
      stat.textContent = '좋아요! 다음 음 추가…'; lock = true; setTimeout(nextRound, 650);
    }
  }
  function win() { lock = true; stat.textContent = '🔇 경보 정지 — 정적 회복!'; stat.classList.add('ok'); ctx.onComplete?.(); }

  setTimeout(() => { ctx.say?.('멜로디를 외워서 똑같이 눌러 경보를 꺼! 🔊'); nextRound(); }, 500);
  return { destroy() { try { ac?.close?.(); } catch (_) {} } };
}
