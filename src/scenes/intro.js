// intro.js — 인트로 씬 (프리미엄)
//   1) Eduino AI  : 플랫폼 소개
//   2) PlayHouse  : 상품(콘텐츠) 진입
//   3) EDDIE 스토리: 주인공이 미션을 건넴 -> "사용환경 준비하기"
// 오로라 그라데이션 배경 + 글래스 카드 + 파티클로 플랫폼다운 고급 도입부.

import eddieSvg from '../assets/eddie.svg?raw';

const STORY = [
  '…부팅 완료. 나는 EDDIE. 🤖 그런데 여긴… 칠흑 같은 폐연구소야.',
  '문은 잠겼고 전원은 꺼졌어. "여기서… 나가야 해."',
  '방마다의 미션을 풀어 시스템을 복구하면 길이 열릴 거야. 도와줄래?',
  '그 전에, 내 장비가 깨어났는지 같이 점검하자!',
];

export function showIntro(root, { onDone }) {
  root.innerHTML = `
    <div class="intro scene-fade">
      <div class="intro-aurora"></div>
      <div class="intro-grid"></div>
      <div class="digital-bg"></div>
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
      <div class="intro-brand">AI CODING PLATFORM</div>
      <h1 class="intro-title gradient lb-logo">Eduino <span>AI</span></h1>
      <p class="intro-sub">브라우저로 직접 배우는 AI 실험실</p>
      <p class="intro-desc">코드가 진짜 세상을 움직이는 걸 경험하는<br/>AIoT 코딩·교구 학습 플랫폼.</p>
      ${dots(0)}
      <div class="intro-actions"><button class="btn primary lg" id="i-next">시작하기 ▶</button></div>`;
  }
  function renderPlayhouse() {
    return `
      <div class="cover">
        <div class="cover-kicker"><span class="brand-dot"></span>EDUINO AI 시리즈 · 01</div>
        <div class="cover-title">Playino<span class="cv-colon"> : </span><span class="cv-er">Escape Room</span></div>
        <div class="cover-sub">스타터 키트 <span class="cv-dot">·</span> <b>종합편</b></div>
        <div class="intro-eddie float cover-eddie">${eddieSvg}</div>
        <p class="intro-desc">어둠 속 폐연구소에 깨어난 EDDIE.<br/>
          방마다의 미션을 풀어 시스템을 복구하고 <b>탈출</b>하라.</p>
      </div>
      ${dots(1)}
      <div class="intro-actions"><button class="btn primary lg" id="i-next">다음 ▶</button></div>`;
  }
  function renderStory() {
    return `
      <div class="intro-brand"><span class="brand-dot"></span>스타터 키트 · 모험의 시작</div>
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
