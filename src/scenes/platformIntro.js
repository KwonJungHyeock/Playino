// platformIntro.js — 'Eduino AI' 플랫폼 인트로(스튜디오 ident).
// 미니멀 블랙 + 중앙 로고 리빌 + 페이드 인/아웃. (레퍼런스 컨셉 차용, 색은 자체 정체성)
// public/brand/eduino-ai-logo.png 가 있으면 워드마크 대신 자동으로 그 로고를 사용한다.

const HOLD_MS = 3200;    // 등장 후 유지(페이드아웃 전)
const OUT_MS = 760;      // 페이드아웃
const SAFETY_MS = 7000;

const MARK = `
  <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="pi-g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#6fb7ff"/><stop offset="1" stop-color="#a78bfa"/>
      </linearGradient>
    </defs>
    <path d="M50 5 C57 33 67 43 95 50 C67 57 57 67 50 95 C43 67 33 57 5 50 C33 43 43 33 50 5 Z" fill="url(#pi-g)"/>
    <circle cx="80" cy="22" r="4.5" fill="#a78bfa"/>
  </svg>`;

export function showPlatformIntro(root, { onDone } = {}) {
  root.innerHTML = `
    <div class="platform-intro" id="pintro">
      <div class="pi-card" id="pi-card"></div>
      <div class="pi-grain"></div>
      <div class="pi-vignette"></div>
      <div class="pi-bg" id="pi-bg"></div>
      <div class="pi-stage">
        <div class="pi-mark">${MARK}</div>
        <img class="pi-logo-img" id="pi-img" alt="Eduino AI" hidden />
        <h1 class="pi-word"><span class="pi-e">Eduino</span> <span class="pi-ai">AI</span></h1>
        <div class="pi-tag">AIoT LEARNING PLATFORM</div>
      </div>
      <div class="pi-skip">화면을 누르면 건너뜁니다</div>
    </div>`;

  const el = root.querySelector('#pintro');

  // 타이틀 카드 그림(제목이 박힌 한 장)이 있으면 → 카드 모드(로고 숨기고 필름효과로 전환)
  const cardProbe = new Image();
  cardProbe.onload = () => {
    const c = el.querySelector('#pi-card');
    c.style.backgroundImage = `url(${cardProbe.src})`;
    el.classList.add('card-mode');
  };
  cardProbe.src = '/brand/intro-card.png';

  // (카드 없을 때) 추상 배경 이미지가 있으면 적용
  const bgProbe = new Image();
  bgProbe.onload = () => { const bg = el.querySelector('#pi-bg'); bg.style.backgroundImage = `url(${bgProbe.src})`; bg.classList.add('has-img'); };
  bgProbe.src = '/brand/intro-bg.png';

  // 실제 로고 이미지가 준비돼 있으면 워드마크 대신 사용
  const probe = new Image();
  probe.onload = () => {
    const img = el.querySelector('#pi-img');
    img.src = probe.src; img.hidden = false;
    el.querySelector('.pi-mark').hidden = true;
    el.querySelector('.pi-word').hidden = true;
  };
  probe.src = '/brand/eduino-ai-logo.png';

  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));

  let done = false;
  const finish = () => {
    if (done) return; done = true;
    cleanup();
    el.classList.add('out');
    setTimeout(() => { el.remove(); onDone?.(); }, OUT_MS);
  };
  const onSkip = () => finish();
  window.addEventListener('keydown', onSkip);
  window.addEventListener('pointerdown', onSkip);
  function cleanup() { window.removeEventListener('keydown', onSkip); window.removeEventListener('pointerdown', onSkip); clearTimeout(t1); clearTimeout(t2); }

  const t1 = setTimeout(finish, HOLD_MS);
  const t2 = setTimeout(finish, SAFETY_MS);
}
