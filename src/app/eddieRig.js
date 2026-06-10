// eddieRig.js — 움직이는 EDDIE.
// 우선순위: ① rig 부위(body/head/arm-l/arm-r/antenna) 5장 → 퍼펫 리깅
//          ② 풀바디 포즈(idle/wave/cheer) → 부드러운 교차 애니(둥실+손흔들+만세)
//          ③ 둘 다 없으면 정지 히어로(eddie-hero.png) 폴백  (전부 전체 둥실 모션)
const RIG_BASE = '/brand/eddie/rig/';
const PARTS = { 'er-arm-l': 'arm-l.png', 'er-body': 'body.png', 'er-arm-r': 'arm-r.png', 'er-head': 'head.png', 'er-antenna': 'antenna.png' };
const POSE_BASE = '/brand/eddie/';
const POSES = ['idle', 'wave', 'cheer'];
const FALLBACK = '/brand/eddie/eddie-hero.png';

export function mountEddieRig(container, { hero } = {}) {
  const el = document.createElement('div');
  el.className = 'eddie-rig';
  // 방별 코스튬: hero 한 장만 둥실(리깅/포즈 건너뜀)
  if (hero) {
    el.innerHTML = `<img class="er-fallback" alt="EDDIE" />`;
    el.querySelector('.er-fallback').src = hero;
    container.appendChild(el);
    return el;
  }
  el.innerHTML =
    Object.keys(PARTS).map((cls) => `<img class="er-part ${cls}" alt="" />`).join('') +
    POSES.map((p) => `<img class="er-pose er-pose-${p}" alt="" />`).join('') +
    `<img class="er-fallback" alt="EDDIE" />`;
  container.appendChild(el);

  // ① rig 부위 (모두 있으면 리깅)
  let rigLoaded = 0; const rigNeed = Object.keys(PARTS).length; let rigFailed = false;
  for (const [cls, file] of Object.entries(PARTS)) {
    const img = el.querySelector('.' + cls);
    img.onload = () => { if (rigFailed) return; if (++rigLoaded === rigNeed) el.classList.add('rigged'); };
    img.onerror = () => { rigFailed = true; };
    img.src = RIG_BASE + file;
  }

  // ② 풀바디 포즈
  const loaded = new Set();
  let pending = POSES.length;
  POSES.forEach((p) => {
    const img = el.querySelector('.er-pose-' + p);
    img.onload = () => { loaded.add(p); settle(); };
    img.onerror = () => { settle(); };
    img.src = POSE_BASE + p + '.png';
  });
  function settle() { if (--pending > 0) return; if (!el.classList.contains('rigged') && loaded.has('idle')) startPoses(); }

  // ③ 폴백
  el.querySelector('.er-fallback').src = FALLBACK;

  function startPoses() {
    el.classList.add('posed');
    const order = ['idle'];
    if (loaded.has('wave')) order.push('wave');
    order.push('idle');
    if (loaded.has('cheer')) order.push('cheer');
    const dur = { idle: 4200, wave: 1500, cheer: 1700 };
    const show = (p) => POSES.forEach((q) => {
      const im = el.querySelector('.er-pose-' + q); if (!im) return;
      const on = q === p;
      im.style.opacity = on ? '1' : '0';
      im.style.transform = on ? 'translateY(0) scale(1)' : 'translateY(12px) scale(.965)';
    });
    let i = 0;
    const tick = () => {
      if (!document.contains(el)) return;          // 씬 전환 시 자동 정지(누수 방지)
      const p = order[i % order.length]; show(p); i++;
      setTimeout(tick, dur[p] || 3000);
    };
    show('idle');
    setTimeout(tick, dur.idle);
  }

  return el;
}
