// splash.js — 앱 시작 스플래시(인트로)
// public/intro.png 를 화면 전체(cover, 중앙)로 그대로 표시.
// 2.5초(또는 이미지 로드 완료) 후 0.6s fade-out → onDone.
// 클릭/아무 키 입력 시 즉시 스킵.

const MIN_SHOW_MS = 2500;
const SAFETY_MS = 6000;

export function showSplash(root, { onDone } = {}) {
  root.innerHTML = `
    <div class="splash" id="splash">
      <img class="splash-img" src="/intro.png" alt="Eduino AI" />
    </div>
  `;
  const el = root.querySelector('#splash');
  const img = el.querySelector('.splash-img');

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    cleanup();
    el.classList.add('fade-out');
    setTimeout(() => { el.remove(); onDone?.(); }, 600);
  };

  // 스킵: 클릭 / 키 입력
  const onKey = () => finish();
  const onClick = () => finish();
  window.addEventListener('keydown', onKey);
  window.addEventListener('pointerdown', onClick);
  function cleanup() {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('pointerdown', onClick);
  }

  // 2.5초 후, 단 이미지 로드가 끝난 뒤에 fade-out
  let loaded = img.complete && img.naturalWidth > 0;
  img.addEventListener('load', () => { loaded = true; });
  img.addEventListener('error', () => { loaded = true; }); // 누락 시에도 진행
  setTimeout(() => {
    if (loaded) finish();
    else { img.addEventListener('load', finish); img.addEventListener('error', finish); }
  }, MIN_SHOW_MS);
  setTimeout(finish, SAFETY_MS); // 안전장치
}
