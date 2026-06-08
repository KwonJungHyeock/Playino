// kits.js — 호환 키트 안내 페이지.
// 이 게임은 '스타터 키트 [종합편]' 기준으로 제작됐지만, 다른 키트들도 호환됨을 안내한다.
// 제품 사진은 public/brand/kits/<id>.png 자동 교체형(없으면 📦 플레이스홀더).

const KITS = [
  { id: 'comprehensive', name: '스타터 키트 [종합편]', note: '이 게임의 기준 키트', base: true },
  { id: 'intro', name: '스타터 키트 [입문편]', note: '핵심 부품으로 입문' },
  { id: 'easy', name: '이지 커넥트편 · 50종', note: '납땜 없이 쉽게 연결' },
  { id: 'sensor', name: '센서 마스터편 · 45종', note: '다양한 센서 집중' },
];

export function showKits(root, { onDone } = {}) {
  root.innerHTML = `
    <div class="kits scene-fade">
      <div class="kits-bg" id="kits-bg"></div>
      <div class="brand-badge"><span class="brand-dot"></span>Eduino&nbsp;<b>AI</b></div>
      <div class="kits-inner">
        <div class="kits-head">
          <div class="kits-kicker"><span class="brand-dot"></span>호환 키트 안내</div>
          <h1 class="kits-title">어떤 <span class="grad">에듀이노 키트</span>로도 즐겨요</h1>
          <p class="kits-sub">이 <b>미니게임천국</b>은 <b>[종합편]</b> 기준으로 제작됐어요.<br/>아래 에듀이노 키트들과 <b>함께 사용</b>하시길 권장해요!</p>
        </div>
        <div class="kits-grid">
          ${KITS.map((k) => `
            <div class="kit-card${k.base ? ' base' : ''}" data-id="${k.id}">
              ${k.base ? '<span class="kit-ribbon">기준 · BASE</span>' : ''}
              <div class="kit-img" id="kit-${k.id}"><span class="kit-ph">📦</span></div>
              <div class="kit-name">${k.name}</div>
              <div class="kit-note">${k.note}</div>
            </div>`).join('')}
        </div>
        <button class="btn primary lg kits-go" id="kits-go">계속하기 ▶</button>
      </div>
    </div>`;

  // 배경 컨셉 통일(메인 카니발 있으면 recede로 깔기)
  const bgProbe = new Image();
  bgProbe.onload = () => { const b = root.querySelector('#kits-bg'); b.style.backgroundImage = `url(${bgProbe.src})`; b.classList.add('has-img'); };
  bgProbe.src = '/brand/main-bg.png';

  // 제품 사진 자동 적용
  KITS.forEach((k) => {
    const probe = new Image();
    probe.onload = () => { const box = root.querySelector('#kit-' + k.id); box.style.backgroundImage = `url(${probe.src})`; box.classList.add('has-img'); };
    probe.src = `/brand/kits/${k.id}.png`;
  });

  root.querySelector('#kits-go').addEventListener('click', () => onDone?.());
}
