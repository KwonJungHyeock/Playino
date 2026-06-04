// intro.js — 인트로(스토리 도입) 씬
// 실행 시 가장 먼저 등장. EDDIE 가 플레이어에게 말을 걸고(타자기 효과),
// "모험 시작하기" 로 거실 레슨에 진입한다. 에듀테크 도입부.

import eddieSvg from '../assets/eddie.svg?raw';

const STORY = [
  '안녕! 나는 EDDIE야. 🤖',
  '방금 PlayHouse에 도착했는데… 집이 온통 깜깜해.',
  '너의 코드로 불을 켜고, 집을 똑똑하게 만들어 줄래?',
];

/**
 * 인트로를 띄우고, 시작하면 onStart() 를 호출한다.
 * @param {() => void} onStart
 */
export function showIntro(onStart) {
  const root = document.createElement('div');
  root.className = 'intro';
  root.innerHTML = `
    <div class="intro-bg"></div>
    <div class="intro-card">
      <div class="intro-brand"><span class="brand-dot"></span>Playino · PlayHouse</div>
      <h1 class="intro-title">EDDIE와 함께하는<br/>스마트홈 모험</h1>

      <div class="intro-eddie">${eddieSvg}</div>

      <div class="intro-speech">
        <span id="intro-speech-text"></span><span class="intro-caret">▋</span>
      </div>

      <div class="intro-actions">
        <button class="btn primary intro-start" id="intro-start" hidden>모험 시작하기 ▶</button>
      </div>

      <button class="intro-skip" id="intro-skip">건너뛰기 →</button>
      <div class="intro-foot">거실에서 시작 · 1 / 5</div>
    </div>
  `;
  document.body.appendChild(root);

  let closed = false;
  let timer = null;
  const speech = root.querySelector('#intro-speech-text');
  const startBtn = root.querySelector('#intro-start');
  const skipBtn = root.querySelector('#intro-skip');

  // 타자기 효과
  let line = 0;
  function typeLine() {
    if (closed) return;
    const text = STORY[line];
    let i = 0;
    const tick = () => {
      if (closed) return;
      speech.textContent = text.slice(0, i++);
      if (i <= text.length) {
        timer = setTimeout(tick, 36);
      } else if (line < STORY.length - 1) {
        line++;
        timer = setTimeout(typeLine, 850);
      } else {
        revealStart();
      }
    };
    tick();
  }

  function revealStart() {
    if (closed) return;
    startBtn.hidden = false;
    requestAnimationFrame(() => startBtn.classList.add('show'));
  }

  function finish() {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    root.classList.add('closing');
    setTimeout(() => {
      root.remove();
      onStart?.();
    }, 380);
  }

  startBtn.addEventListener('click', finish);
  skipBtn.addEventListener('click', () => {
    // 스토리를 끝까지 즉시 표시 후 시작 (한 번 더 누르면 finish)
    if (startBtn.hidden) {
      closed = false;
      clearTimeout(timer);
      speech.textContent = STORY[STORY.length - 1];
      line = STORY.length - 1;
      revealStart();
    } else {
      finish();
    }
  });

  typeLine();
}
