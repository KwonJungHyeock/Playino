// splash.js — 앱 시작 스플래시(인트로)
// public/intro.png 를 화면 전체(cover, 중앙)로 그대로 표시.
// 페이드인(부드럽게 등장) → 충분히 머무름 → 페이드아웃 → onDone. 클릭/키 즉시 스킵.

const FADE_MS = 900;      // 페이드 인/아웃 시간
const HOLD_MS = 4200;     // 화면 유지(페이드인 포함 체감)
const SAFETY_MS = 8000;

export function showSplash(root, { onDone } = {}) {
  root.innerHTML = `
    <div class="splash" id="splash">
      <img class="splash-img" src="/intro.png" alt="Eduino AI" />
      <div class="splash-loader"><div class="splash-loader-fill" id="splash-fill"></div></div>
    </div>
  `;
  const el = root.querySelector('#splash');
  const img = el.querySelector('.splash-img');
  const fill = el.querySelector('#splash-fill');

  // 페이드인
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));

  // 실제 로딩되는 것처럼 게이지 0→100% 애니메이션 (HOLD_MS 동안)
  const startT = performance.now();
  let rafId = 0;
  const animate = (now) => {
    const p = Math.min(1, (now - startT) / HOLD_MS);
    // 살짝 가속/감속 + 미세 떨림으로 진짜 로딩 느낌
    const eased = p < 0.92 ? p : 0.92 + (p - 0.92) * 0.9;
    fill.style.width = (eased * 100).toFixed(1) + '%';
    if (p < 1 && !finished) rafId = requestAnimationFrame(animate);
    else fill.style.width = '100%';
  };
  rafId = requestAnimationFrame(animate);

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    cleanup();
    el.classList.remove('in');
    el.classList.add('fade-out');
    setTimeout(() => { el.remove(); onDone?.(); }, FADE_MS);
  };

  const onKey = () => finish();
  const onClick = () => finish();
  window.addEventListener('keydown', onKey);
  window.addEventListener('pointerdown', onClick);
  function cleanup() {
    cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('pointerdown', onClick);
  }

  let loaded = img.complete && img.naturalWidth > 0;
  img.addEventListener('load', () => { loaded = true; });
  img.addEventListener('error', () => { loaded = true; });
  setTimeout(() => {
    if (loaded) finish();
    else { img.addEventListener('load', finish); img.addEventListener('error', finish); }
  }, HOLD_MS);
  setTimeout(finish, SAFETY_MS);
}
