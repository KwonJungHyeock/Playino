// eddieRig.js — EDDIE 퍼펫 리깅(부위 분리 → CSS로 움직임).
// /brand/eddie/rig/{body,head,arm-l,arm-r,antenna}.png 5장이 모두 있으면 리깅 모드로
// 머리 갸웃·팔 흔들·안테나 펄스·전체 둥실 애니메이션. 하나라도 없으면 정지 히어로로 폴백.
const RIG_BASE = '/brand/eddie/rig/';
const PARTS = { 'er-arm-l': 'arm-l.png', 'er-body': 'body.png', 'er-arm-r': 'arm-r.png', 'er-head': 'head.png', 'er-antenna': 'antenna.png' };
const FALLBACK = '/brand/eddie/eddie-hero.png';

// container 안에 EDDIE를 mount. 반환 element.
export function mountEddieRig(container) {
  const el = document.createElement('div');
  el.className = 'eddie-rig';
  el.innerHTML =
    Object.keys(PARTS).map((cls) => `<img class="er-part ${cls}" alt="" />`).join('') +
    `<img class="er-fallback" alt="EDDIE" />`;

  let loaded = 0; const need = Object.keys(PARTS).length; let failed = false;
  for (const [cls, file] of Object.entries(PARTS)) {
    const img = el.querySelector('.' + cls);
    img.onload = () => { if (failed) return; loaded++; if (loaded === need) el.classList.add('rigged'); };
    img.onerror = () => { failed = true; };
    img.src = RIG_BASE + file;
  }
  el.querySelector('.er-fallback').src = FALLBACK;

  container.appendChild(el);
  return el;
}
