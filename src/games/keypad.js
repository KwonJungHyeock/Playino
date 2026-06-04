// keypad.js — 출입문 비번(키패드). 4자리 비밀번호를 추리(마스터마인드형).
// 추측마다 ● = 자리·숫자 일치, ○ = 숫자는 있지만 자리 다름. 제한 시도 안에 풀면 문 해제.
const LEN = 4, TRIES = 8;

export function mountKeypad(root, ctx) {
  const secret = Array.from({ length: LEN }, () => (Math.random() * 10) | 0);
  let cur = [], rows = 0, over = false;

  root.innerHTML = `
    <div class="game keypadgame">
      <p class="game-lead">🔢 잠긴 출입문. <b>4자리 비밀번호</b>를 추리하세요. <span class="kp-leg">●자리·숫자 일치 ○숫자만 일치</span></p>
      <div class="kp-wrap">
        <div class="kp-history" id="kp-hist"></div>
        <div class="kp-current" id="kp-cur"></div>
        <div class="kp-pad">
          ${[1,2,3,4,5,6,7,8,9].map((n) => `<button class="kp-key" data-n="${n}">${n}</button>`).join('')}
          <button class="kp-key kp-del" id="kp-del">⌫</button>
          <button class="kp-key" data-n="0">0</button>
          <button class="kp-key kp-ok" id="kp-ok">확인</button>
        </div>
        <div class="rgb-status" id="kp-status">남은 시도 ${TRIES}</div>
      </div>
    </div>`;

  const histEl = root.querySelector('#kp-hist');
  const curEl = root.querySelector('#kp-cur');
  const stat = root.querySelector('#kp-status');
  const keys = [...root.querySelectorAll('.kp-key[data-n]')];
  keys.forEach((b) => (b.onclick = () => add(+b.dataset.n)));
  root.querySelector('#kp-del').onclick = () => { if (over) return; cur.pop(); paint(); };
  root.querySelector('#kp-ok').onclick = submit;
  paint();
  setTimeout(() => ctx.say?.('●은 자리까지 맞은 숫자, ○은 숫자만 맞은 거야. 단서를 조합해봐! 🔍'), 300);

  function add(n) { if (over || cur.length >= LEN) return; cur.push(n); paint(); }
  function paint() {
    curEl.innerHTML = Array.from({ length: LEN }, (_, i) => `<span class="kp-cell${cur[i] != null ? ' f' : ''}">${cur[i] ?? ''}</span>`).join('');
  }
  function submit() {
    if (over || cur.length < LEN) { stat.textContent = '4자리를 모두 입력하세요'; return; }
    const guess = cur.slice();
    const { exact, partial } = score(guess, secret);
    rows++;
    histEl.insertAdjacentHTML('beforeend', `<div class="kp-hrow"><span class="kp-g">${guess.join(' ')}</span>
      <span class="kp-fb">${'●'.repeat(exact)}${'○'.repeat(partial)}${'·'.repeat(LEN - exact - partial)}</span></div>`);
    histEl.scrollTop = histEl.scrollHeight;
    cur = []; paint();
    if (exact === LEN) { over = true; stat.textContent = '🔓 비밀번호 일치 — 출입문 해제!'; stat.classList.add('ok'); ctx.onComplete?.(); return; }
    const left = TRIES - rows;
    if (left <= 0) { secret.forEach(() => {}); stat.textContent = `정답은 ${secret.join(' ')} — 다시 도전!`; over = true; setTimeout(reset, 1600); return; }
    stat.textContent = `●${exact} ○${partial} · 남은 시도 ${left}`;
  }
  function reset() { rows = 0; over = false; histEl.innerHTML = ''; for (let i = 0; i < LEN; i++) secret[i] = (Math.random() * 10) | 0; stat.textContent = `남은 시도 ${TRIES}`; }
  function score(g, s) {
    let exact = 0; const sc = s.slice(), gc = g.slice();
    for (let i = 0; i < LEN; i++) if (gc[i] === sc[i]) { exact++; sc[i] = gc[i] = -1; }
    let partial = 0;
    for (let i = 0; i < LEN; i++) { if (gc[i] === -1) continue; const j = sc.indexOf(gc[i]); if (j >= 0) { partial++; sc[j] = -2; } }
    return { exact, partial };
  }
  return { destroy() {} };
}
