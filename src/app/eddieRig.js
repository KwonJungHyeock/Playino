// eddieRig.js — 움직이는 EDDIE (관절 퍼펫).
// 우선순위: ① rig 9부위(머리/몸통/안테나/2단 팔×2/다리×2) → 관절 퍼펫(끄덕·팔흔들·안테나·통통)
//          ② 풀바디 포즈(idle/wave/cheer) → 교차 애니
//          ③ 둘 다 없으면 정지 히어로(eddie-hero) 폴백
// 모든 부위는 같은 1080 캔버스에 '제자리'로 렌더되어 inset:0 로 겹치면 정확히 조립된다.
// 회전축(transform-origin)은 CSS 에 캔버스 % 로 지정(관절 위치).

const RIG_BASE = '/brand/eddie/rig/';
// 셀렉터 → 파일명 (좌/우 팔은 래퍼 안에 상/하완)
const RIG_SRC = {
  '.er-leg-l': 'leg-l', '.er-leg-r': 'leg-r', '.er-body': 'body',
  '.er-arm-l > .er-aup': 'arm-l-up', '.er-arm-l .er-alow': 'arm-l-low',
  '.er-arm-r > .er-aup': 'arm-r-up', '.er-arm-r .er-alow': 'arm-r-low',
  '.er-head': 'head', '.er-antenna': 'antenna',
};
const POSE_BASE = '/brand/eddie/';
const POSES = ['idle', 'wave', 'cheer'];
const FALLBACK = '/brand/eddie/eddie-hero.webp';

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
    // ① 관절 퍼펫 (뒤→앞 레이어 순서)
    `<img class="erp er-leg-l" alt="" />
     <img class="erp er-leg-r" alt="" />
     <img class="erp er-body" alt="" />
     <div class="er-arm er-arm-l"><img class="erp er-aup" alt="" /><div class="er-fore er-fore-l"><img class="erp er-alow" alt="" /></div></div>
     <div class="er-arm er-arm-r"><img class="erp er-aup" alt="" /><div class="er-fore er-fore-r"><img class="erp er-alow" alt="" /></div></div>
     <img class="erp er-head" alt="" />
     <img class="erp er-antenna" alt="" />` +
    // ② 풀바디 포즈 + ③ 폴백
    POSES.map((p) => `<img class="er-pose er-pose-${p}" alt="" />`).join('') +
    `<img class="er-fallback" alt="EDDIE" />`;
  container.appendChild(el);

  // ① rig 부위 로드 — 전부 성공해야 퍼펫(rig2) 활성
  const sels = Object.keys(RIG_SRC);
  let need = sels.length, loaded = 0, failed = false;
  for (const sel of sels) {
    const img = el.querySelector(sel);
    img.onload = () => { if (failed) return; if (++loaded === need) el.classList.add('rig2'); };
    img.onerror = () => { if (!failed) { failed = true; settle(); } };
    img.src = RIG_BASE + RIG_SRC[sel] + '.webp';
  }

  // ② 풀바디 포즈 (rig 실패 시 폴백)
  const loadedPose = new Set();
  let pending = POSES.length;
  POSES.forEach((p) => {
    const img = el.querySelector('.er-pose-' + p);
    img.onload = () => { loadedPose.add(p); settle(); };
    img.onerror = () => { settle(); };
    img.src = POSE_BASE + p + '.webp';
  });
  function settle() { if (--pending > 0) return; if (!el.classList.contains('rig2') && loadedPose.has('idle')) startPoses(); }

  // ③ 폴백 정지 히어로
  el.querySelector('.er-fallback').src = FALLBACK;

  function startPoses() {
    el.classList.add('posed');
    const order = ['idle'];
    if (loadedPose.has('wave')) order.push('wave');
    order.push('idle');
    if (loadedPose.has('cheer')) order.push('cheer');
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
