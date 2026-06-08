// productMain.js — 상품 메인(타이틀 스크린) 'Eduino AI : 미니게임천국'.
// 인트로(빈티지→컬러풀)와 어울리는 게임 타이틀 화면. 학습 항목은 노출하지 않고
// 브랜드/타이틀을 부각. 배경: public/brand/main-bg.png(있으면) / EDDIE: 퍼펫 리깅.
import { mountEddieRig } from '../app/eddieRig.js';

export function showProductMain(root, { onDone } = {}) {
  root.innerHTML = `
    <div class="pm scene-fade">
      <div class="pm-bg" id="pm-bg"></div>
      <div class="pm-blobs"><span></span><span></span><span></span><span></span></div>
      <div class="pm-scrim"></div>
      <div class="pm-vig"></div>
      <div class="brand-badge"><span class="brand-dot"></span>Eduino&nbsp;<b>AI</b></div>
      <div class="pm-inner">
        <div class="pm-copy">
          <h1 class="pm-title">미니게임<span class="pm-heaven">천국</span></h1>
          <p class="pm-sub">다양한 <b>센서</b>를 게임으로 배우고, 모든 미션을 클리어해 <b>진척 100%</b>를 달성하라!</p>
          <button class="btn primary lg pm-cta" id="pm-go">시작하기 ▶</button>
        </div>
        <div class="pm-hero" id="pm-hero"></div>
      </div>
    </div>`;

  const bgProbe = new Image();
  bgProbe.onload = () => { const bg = root.querySelector('#pm-bg'); bg.style.backgroundImage = `url(${bgProbe.src})`; bg.classList.add('has-img'); root.querySelector('.pm').classList.add('has-bg'); };
  bgProbe.src = '/brand/main-bg.png';

  // 움직이는 EDDIE (포즈 교차 애니 / 없으면 정지 히어로)
  mountEddieRig(root.querySelector('#pm-hero'));

  root.querySelector('#pm-go').addEventListener('click', () => onDone?.());
}
