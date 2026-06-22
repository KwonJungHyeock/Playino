// videoIntro.js — 게임 시작 시 제일 처음 노출되는 HTML 브랜드 인트로(intro.html)를 iframe으로 재생.
//   · 로딩 중 표시 → 로드되면 표시  · '시작하기'/건너뛰기 버튼 항상 노출  · 안전장치 자동 진행.
const SRC = '/brand/intro-logo/intro.html';
const SAFETY_MS = 30000;   // 무반응 대비 자동 진행(인트로를 자르지 않도록 넉넉히)

export function showVideoIntro(root, { onDone } = {}) {
  root.innerHTML = `
    <div class="video-intro" id="vintro">
      <div class="vi-loading" id="vi-load">인트로 불러오는 중… ✨</div>
      <iframe class="vi-frame" id="vi-frame" title="Eduino AI 인트로" allow="autoplay" hidden></iframe>
      <button class="vi-skip" id="vi-skip">시작하기 ▶</button>
    </div>`;
  const el = root.querySelector('#vintro');
  const frame = root.querySelector('#vi-frame');
  const load = root.querySelector('#vi-load');

  let done = false, safety = null;
  function finish() {
    if (done) return; done = true;
    clearTimeout(safety);
    el.classList.add('out');
    setTimeout(() => onDone?.(), 380);
  }
  frame.addEventListener('load', () => { load.style.display = 'none'; frame.hidden = false; });
  frame.addEventListener('error', finish);   // 못 불러오면 바로 다음으로
  frame.src = SRC;

  root.querySelector('#vi-skip').onclick = finish;
  safety = setTimeout(finish, SAFETY_MS);
}
