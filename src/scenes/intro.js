// intro.js — 인트로 씬 (멀티 슬라이드)
//   1) Eduino AI  : 플랫폼 소개
//   2) PlayHouse  : 상품(콘텐츠) 진입
//   3) EDDIE 스토리: 주인공이 미션을 건넴 -> "사용환경 준비하기"
// 에듀테크 도입부.

import eddieSvg from '../assets/eddie.svg?raw';

const STORY = [
  '안녕! 나는 EDDIE야. 🤖',
  '방금 PlayHouse에 도착했는데… 집이 온통 깜깜해.',
  '먼저 우리 장비가 잘 작동하는지 같이 점검하자!',
];

/**
 * @param {HTMLElement} root
 * @param {{onDone: () => void}} opts
 */
export function showIntro(root, { onDone }) {
  root.innerHTML = `
    <div class="intro scene-fade">
      <div class="intro-bg"></div>
      <div class="intro-card" id="intro-card"></div>
      <button class="intro-skip" id="intro-skip">건너뛰기 →</button>
    </div>
  `;
  const card = root.querySelector('#intro-card');
  root.querySelector('#intro-skip').addEventListener('click', onDone);

  const slides = [renderEduino, renderPlayhouse, renderStory];

  function dots(active) {
    return `<div class="intro-dots">${slides
      .map((_, k) => `<span class="${k === active ? 'on' : ''}"></span>`)
      .join('')}</div>`;
  }

  function renderEduino() {
    return `
      <div class="intro-brand"><span class="brand-dot"></span>Eduino AI</div>
      <h1 class="intro-title">Eduino <span class="accent">AI</span></h1>
      <p class="intro-sub">AI와 함께 배우는 피지컬 컴퓨팅</p>
      <p class="intro-desc">코드가 진짜 세상을 움직이는 걸 경험하는<br/>AI 코딩 학습 플랫폼.</p>
      ${dots(0)}
      <div class="intro-actions"><button class="btn primary" id="i-next">다음 ▶</button></div>`;
  }
  function renderPlayhouse() {
    return `
      <div class="intro-brand"><span class="brand-dot"></span>Eduino AI 시리즈</div>
      <h1 class="intro-title">PlayHouse 🏠</h1>
      <div class="intro-eddie">${eddieSvg}</div>
      <p class="intro-desc">EDDIE와 함께 <b>스마트홈</b>을 코딩으로 깨우는 모험.<br/>
        거실부터 현관까지, 너의 코드로 불을 켜고 센서를 다뤄봐!</p>
      ${dots(1)}
      <div class="intro-actions"><button class="btn primary" id="i-next">다음 ▶</button></div>`;
  }
  function renderStory() {
    return `
      <div class="intro-brand"><span class="brand-dot"></span>PlayHouse</div>
      <div class="intro-eddie">${eddieSvg}</div>
      <div class="intro-speech"><span id="intro-sp"></span><span class="intro-caret">▋</span></div>
      ${dots(2)}
      <div class="intro-actions">
        <button class="btn primary" id="i-start" hidden>사용환경 준비하기 ▶</button>
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

function typewriter(el, lines, onEnd) {
  let line = 0;
  function typeLine() {
    const text = lines[line];
    let i = 0;
    const tick = () => {
      if (!document.contains(el)) return;          // 씬 교체 시 중단
      el.textContent = text.slice(0, i++);
      if (i <= text.length) setTimeout(tick, 36);
      else if (line < lines.length - 1) { line++; setTimeout(typeLine, 850); }
      else onEnd();
    };
    tick();
  }
  typeLine();
}
