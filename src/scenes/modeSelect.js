// modeSelect.js — 인트로 직후 PC/태블릿 모드 선택 화면
import { setMode, recommendedMode } from '../app/device.js';
import { sfx } from '../app/sfx.js';

export function showModeSelect(root, { onDone } = {}) {
  const rec = recommendedMode();
  const recTag = (m) => rec === m ? '<span class="ms-badge">✨ 추천</span>' : '';
  root.innerHTML = `
    <div class="mode-select scene-fade">
      <div class="ms-aurora"></div>
      <div class="ms-inner">
        <div class="ms-head">
          <div class="ms-bot"><img src="/brand/eddie/eddie-hero.webp" alt="EDDIE" /></div>
          <h1>어떤 기기로 접속했나요?</h1>
          <p class="ms-sub">기기에 맞춰 조작 방식을 자동으로 맞춰드려요.<br/>게임 중 화면 버튼으로 언제든 바꿀 수 있어요.</p>
        </div>
        <div class="ms-opts">
          <button class="ms-opt ${rec === 'pc' ? 'rec' : ''}" data-m="pc">
            ${recTag('pc')}
            <div class="ms-screen ms-pc"><div class="ms-scr-glow"></div><span>🖥️</span></div>
            <b>PC 모드</b>
            <span class="ms-desc">키보드 <kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> 로 이동</span>
          </button>
          <button class="ms-opt ${rec === 'tablet' ? 'rec' : ''}" data-m="tablet">
            ${recTag('tablet')}
            <div class="ms-screen ms-tab"><div class="ms-scr-glow"></div><span>📱</span></div>
            <b>태블릿 모드</b>
            <span class="ms-desc">화면 <b>조이스틱</b>으로 터치 이동 🕹️</span>
          </button>
        </div>
        <p class="ms-foot">아두이노 연결은 데스크톱급 브라우저(Chrome·Edge)에서 동작해요</p>
      </div>
    </div>`;
  const pick = (m) => { sfx.ok(); setMode(m); root.querySelector('.mode-select')?.classList.add('ms-leave'); setTimeout(() => onDone?.(), 240); };
  root.querySelectorAll('.ms-opt').forEach((b) => b.onclick = () => pick(b.dataset.m));
}
