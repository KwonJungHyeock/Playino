// modeSelect.js — 인트로 직후 PC/태블릿 모드 선택 (최초 1회, 이후 기억)
import { setMode, recommendedMode } from '../app/device.js';
import { sfx } from '../app/sfx.js';

export function showModeSelect(root, { onDone } = {}) {
  const rec = recommendedMode();
  const badge = (m) => rec === m ? '<i class="ms-badge">추천</i>' : '';
  root.innerHTML = `
    <div class="mode-select scene-fade">
      <div class="ms-card">
        <div class="ms-emoji">🤖</div>
        <h1>어떤 기기로 접속했나요?</h1>
        <p class="ms-sub">기기에 맞게 조작 방식을 맞춰드려요. 나중에 화면 버튼으로 언제든 바꿀 수 있어요.</p>
        <div class="ms-opts">
          <button class="ms-opt ${rec === 'pc' ? 'rec' : ''}" data-m="pc">
            <div class="ms-ico">🖥️</div><b>PC 모드</b><span>키보드(방향키)로 이동</span>${badge('pc')}
          </button>
          <button class="ms-opt ${rec === 'tablet' ? 'rec' : ''}" data-m="tablet">
            <div class="ms-ico">📱</div><b>태블릿 모드</b><span>화면 터치로 이동</span>${badge('tablet')}
          </button>
        </div>
      </div>
    </div>`;
  root.querySelectorAll('.ms-opt').forEach((b) => b.onclick = () => { sfx.ok(); setMode(b.dataset.m); onDone?.(); });
}
