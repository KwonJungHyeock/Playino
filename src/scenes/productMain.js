// productMain.js — 상품 메인페이지 'Eduino AI : 미니게임천국' (밝고 컬러풀).
// 에셋 자동 교체형: public/brand/main-bg.png(배경), EDDIE 퍼펫 리깅(움직이는 캐릭터)
import { mountEddieRig } from '../app/eddieRig.js';

// 방마다의 '센서 상황' 미리보기 칩(다양성 어필) — 컬러풀
const CHIPS = [
  { icon: '💡', name: 'LED', tag: '불 켜기', c: '#ffd24a' },
  { icon: '🌈', name: 'RGB', tag: '색 맞추기', c: '#ff7ab8' },
  { icon: '🔊', name: '부저', tag: '리듬 맞추기', c: '#ff6a5a' },
  { icon: '🌡️', name: '온습도', tag: '쾌적 지키기', c: '#5ad1c4' },
  { icon: '🎚️', name: '다이얼', tag: '주파수 튜닝', c: '#9b8cff' },
  { icon: '🔢', name: '키패드', tag: '비밀번호', c: '#6fb7ff' },
];

export function showProductMain(root, { onDone } = {}) {
  root.innerHTML = `
    <div class="pm scene-fade">
      <div class="pm-bg" id="pm-bg"></div>
      <div class="pm-blobs"><span></span><span></span><span></span><span></span></div>
      <div class="pm-inner">
        <div class="pm-copy">
          <div class="pm-kicker"><span class="brand-dot"></span>EDUINO AI · 시리즈 01</div>
          <h1 class="pm-title">미니게임<span class="pm-heaven">천국</span></h1>
          <p class="pm-sub">다양한 <b>센서</b>로 즐기는 미니게임 —<br/>방을 하나씩 클리어해 <b>진척 100%</b>가 되면 학습 끝! 🎉</p>
          <div class="pm-chips">
            ${CHIPS.map((c) => `<span class="pm-chip" style="--cc:${c.c}"><b>${c.icon} ${c.name}</b><i>${c.tag}</i></span>`).join('')}
          </div>
          <button class="btn primary lg pm-cta" id="pm-go">시작하기 ▶</button>
        </div>
        <div class="pm-hero" id="pm-hero"></div>
      </div>
    </div>`;

  // 배경 이미지가 있으면 적용
  const bgProbe = new Image();
  bgProbe.onload = () => { const bg = root.querySelector('#pm-bg'); bg.style.backgroundImage = `url(${bgProbe.src})`; bg.classList.add('has-img'); };
  bgProbe.src = '/brand/main-bg.png';

  // 움직이는 EDDIE (퍼펫 리깅, 없으면 정지 히어로 폴백)
  mountEddieRig(root.querySelector('#pm-hero'));

  root.querySelector('#pm-go').addEventListener('click', () => onDone?.());
}
