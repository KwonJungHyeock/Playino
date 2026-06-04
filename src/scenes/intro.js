// intro.js — 인트로 씬 (프리미엄)
//   1) Eduino AI  : 플랫폼 소개
//   2) PlayHouse  : 상품(콘텐츠) 진입
//   3) EDDIE 스토리: 주인공이 미션을 건넴 -> "사용환경 준비하기"
// 오로라 그라데이션 배경 + 글래스 카드 + 파티클로 플랫폼다운 고급 도입부.

import eddieSvg from '../assets/eddie.svg?raw';

const STORY = [
  '안녕! 나는 EDDIE야. 🤖 갓 배송된 꼬마 홈 AI 로봇이지.',
  '여기는 내 새 보금자리 PlayHouse… 그런데 전원이 다 꺼져서 깜깜해.',
  '네가 코드로 나를 도와줄래? 방마다 불을 켜고 집을 깨우는 거야!',
  '그 전에, 우리 장비가 잘 작동하는지 같이 점검하자!',
];

export function showIntro(root, { onDone }) {
  root.innerHTML = `
    <div class="intro scene-fade">
      <div class="intro-aurora"></div>
      <div class="intro-grid"></div>
      <div class="intro-particles">${particles(16)}</div>
      <div class="intro-card glass" id="intro-card"></div>
      <button class="intro-skip" id="intro-skip">건너뛰기 →</button>
    </div>
  `;
  const card = root.querySelector('#intro-card');
  root.querySelector('#intro-skip').addEventListener('click', onDone);

  const slides = [renderEduino, renderPlayhouse, renderStory];

  function dots(active) {
    return `<div class="intro-dots">${slides
      .map((_, k) => `<span class="${k === active ? 'on' : ''}"></span>`).join('')}</div>`;
  }

  function renderEduino() {
    return `
      <div class="logo-mark"><span>E</span><i class="logo-spark"></i></div>
      <div class="intro-brand">AI CODING PLATFORM</div>
      <h1 class="intro-title gradient">Eduino <span>AI</span></h1>
      <p class="intro-sub">AI와 함께 배우는 피지컬 컴퓨팅</p>
      <p class="intro-desc">코드가 진짜 세상을 움직이는 걸 경험하는<br/>차세대 AI 코딩 학습 플랫폼.</p>
      ${dots(0)}
      <div class="intro-actions"><button class="btn primary lg" id="i-next">시작하기 ▶</button></div>`;
  }
  function renderPlayhouse() {
    return `
      <div class="intro-brand"><span class="brand-dot"></span>Eduino AI 시리즈 · 01</div>
      <h1 class="intro-title gradient">PlayHouse</h1>
      <div class="intro-eddie float">${eddieSvg}</div>
      <p class="intro-desc">EDDIE와 함께 <b>스마트홈</b>을 코딩으로 깨우는 모험.<br/>
        거실부터 현관까지, 너의 코드로 불을 켜고 센서를 다뤄봐!</p>
      ${dots(1)}
      <div class="intro-actions"><button class="btn primary lg" id="i-next">다음 ▶</button></div>`;
  }
  function renderStory() {
    return `
      <div class="intro-brand"><span class="brand-dot"></span>PlayHouse · 모험의 시작</div>
      <div class="intro-eddie float">${eddieSvg}</div>
      <div class="intro-speech glass"><span id="intro-sp"></span><span class="intro-caret">▋</span></div>
      ${dots(2)}
      <div class="intro-actions">
        <button class="btn primary lg" id="i-start" hidden>사용환경 준비하기 ▶</button>
      </div>`;
  }

  function go(i) {
    card.classList.remove('in');
    card.innerHTML = slides[i]();
    requestAnimationFrame(() => card.classList.add('in'));
    if (i < 2) {
      card.querySelector('#i-next').addEventListener('click', () => go(i + 1));
    } else {
      typewriter(card.querySelector('#intro-sp'), STORY, () => {
        const b = card.querySelector('#i-start');
        b.hidden = false;
        requestAnimationFrame(() => b.classList.add('show'));
        b.addEventListener('click', onDone);
      });
    }
  }
  go(0);
}

function particles(n) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const left = Math.random() * 100;
    const size = 2 + Math.random() * 4;
    const dur = 9 + Math.random() * 12;
    const delay = -Math.random() * 20;
    const op = 0.15 + Math.random() * 0.35;
    s += `<span style="left:${left}%;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:${delay}s;opacity:${op}"></span>`;
  }
  return s;
}

function typewriter(el, lines, onEnd) {
  let line = 0;
  function typeLine() {
    const text = lines[line];
    let i = 0;
    const tick = () => {
      if (!document.contains(el)) return;
      el.textContent = text.slice(0, i++);
      if (i <= text.length) setTimeout(tick, 36);
      else if (line < lines.length - 1) { line++; setTimeout(typeLine, 850); }
      else onEnd();
    };
    tick();
  }
  typeLine();
}
