// sensorRoom.js — 박물관형 센서 전시관. 한 방에 📖 이론관 + 🎮 체험관.
// 이론관: 센서 정의·원리·활용 + 블록코딩 미리보기(학습). 체험관: 미니게임(게임).
// config 기반이라 센서가 늘면 ROOMS_CFG에 추가만 하면 된다.
import { sfx } from '../app/sfx.js';
import { progress } from '../app/progress.js';
import { mountEddieRig } from '../app/eddieRig.js';
import { showLedGame } from './ledGame.js';

const ROOMS_CFG = {
  led: {
    name: '반짝반짝 라이트쇼', sensor: 'LED · 발광 다이오드', icon: '💡', accent: '255,200,74',
    intro: 'LED로 무대 조명을 켜는 빛의 쇼! 먼저 이론관에서 LED를 배우고, 체험관에서 연주해봐.',
    theory: [
      { icon: '💡', title: 'LED가 뭐야?', body: '전기가 흐르면 빛나는 작은 전구야. <b>한 방향</b>으로만 전기가 흘러 — <b>긴 다리(＋)</b>, <b>짧은 다리(−)</b>!' },
      { icon: '🔀', title: '디지털 출력으로 켜고 끈다', body: '아두이노가 핀에 <b>HIGH(켜짐)/LOW(꺼짐)</b> 신호를 보내 LED를 제어해. 이게 바로 <b>디지털 출력</b>이야.' },
      { icon: '🚦', title: '어디에 쓰일까?', body: '신호등, 전광판, 무대 조명… 모두 LED! <b>켜고 끄는 타이밍</b>이 핵심이라 우리 게임도 리듬 게임이야.' },
    ],
    blocks: ['디지털 [2]번 핀 — 켜기 💡', '0.5초 기다리기 ⏱️', '디지털 [2]번 핀 — 끄기 ⚫', '반복하기 🔁'],
    play: (root, opt) => showLedGame(root, opt),
  },
};

export function showSensorRoom(root, { id, onExit } = {}) {
  const cfg = ROOMS_CFG[id];
  if (!cfg) { onExit?.(); return; }
  const done = progress.isCleared(id);

  root.innerHTML = `
    <div class="sroom scene-fade">
      <div class="pm-bg" id="sr-bg"></div>
      <div class="pm-blobs"><span></span><span></span><span></span><span></span></div>
      <button class="snd-toggle" id="snd-toggle" title="소리 켜기/끄기">${sfx.muted ? '🔇' : '🔊'}</button>
      <button class="bx-exit" id="sr-exit">✕ 무대로</button>
      <div class="brand-badge"><span class="brand-dot"></span>Eduino&nbsp;<b>AI</b></div>

      <div class="sr-inner">
        <div class="sr-head">
          <div class="sr-icon" style="background:rgba(${cfg.accent},.22);border-color:rgba(${cfg.accent},.7)">${cfg.icon}</div>
          <div>
            <h1 class="sr-title">${cfg.name} ${done ? '<span class="sr-clr">· 클리어 ✓</span>' : ''}</h1>
            <p class="sr-sub">${cfg.sensor} 전시관</p>
          </div>
        </div>
        <p class="sr-guide">🤖 ${cfg.intro}</p>
        <div class="sr-stations">
          <button class="sr-card" id="sr-theory">
            <div class="sr-c-ic">📖</div>
            <div class="sr-c-t">이론관</div>
            <div class="sr-c-d">센서 알아보기 + 블록코딩 미리보기</div>
            <div class="sr-c-go">입장 ▸</div>
          </button>
          <button class="sr-card primary" id="sr-play">
            <div class="sr-c-ic">🎮</div>
            <div class="sr-c-t">체험관 ${done ? '🏅' : ''}</div>
            <div class="sr-c-d">미니게임으로 직접 연주!</div>
            <div class="sr-c-go">${done ? '다시 플레이 ▸' : '플레이 ▸'}</div>
          </button>
        </div>
        <div class="sr-hero" id="sr-hero"></div>
      </div>

      <div class="sr-theory-view" id="sr-tview" hidden></div>
    </div>`;

  const bg = new Image(); bg.onload = () => { const e = root.querySelector('#sr-bg'); e.style.backgroundImage = `url(${bg.src})`; e.classList.add('has-img'); };
  bg.src = `/brand/stage-${getChapterOf(id)}-bg.png`;
  mountEddieRig(root.querySelector('#sr-hero'));

  const snd = root.querySelector('#snd-toggle'); snd.onclick = () => { const m = sfx.toggle(); snd.textContent = m ? '🔇' : '🔊'; };
  root.querySelector('#sr-exit').onclick = () => { sfx.pop(); onExit?.(); };
  root.querySelector('#sr-theory').onclick = () => { sfx.click(); openTheory(); };
  root.querySelector('#sr-play').onclick = () => { sfx.click(); cfg.play(root, { onExit: () => showSensorRoom(root, { id, onExit }) }); };

  // ── 이론관 뷰어 ──
  function openTheory() {
    const v = root.querySelector('#sr-tview'); v.hidden = false;
    let ti = 0; const T = cfg.theory;
    function render() {
      const last = ti === T.length;            // 마지막 다음 = 블록코딩 카드
      if (!last) {
        const c = T[ti];
        v.innerHTML = `<div class="prep-card sr-tcard">
          <div class="bx-ic" style="font-size:50px">${c.icon}</div>
          <h2>${c.title}</h2><p class="sr-tbody">${c.body}</p>
          <div class="bx-dots">${T.map((_, i) => `<i class="${i === ti ? 'on' : ''}"></i>`).join('')}<i class="${ti >= T.length ? 'on' : ''}"></i></div>
          <div class="sr-tbtns">
            ${ti > 0 ? '<button class="prep-btn" id="t-prev">◀ 이전</button>' : '<span></span>'}
            <button class="cel-go" id="t-next">다음 ▶</button>
          </div></div>`;
      } else {
        v.innerHTML = `<div class="prep-card sr-tcard">
          <div class="bx-ic" style="font-size:46px">🧩</div>
          <h2>블록코딩 미리보기</h2>
          <p class="sr-tbody">이렇게 블록을 쌓으면 LED가 깜빡여! 체험관에서 직접 타이밍을 맞춰보자.</p>
          <div class="sr-blocks">${cfg.blocks.map((b, i) => `<div class="sr-block" style="animation-delay:${i * 0.12}s">${b}</div>`).join('')}</div>
          <div class="sr-tbtns"><button class="prep-btn" id="t-prev">◀ 이전</button><button class="cel-go" id="t-done">체험하러 가기 🎮</button></div></div>`;
      }
      const prev = v.querySelector('#t-prev'); if (prev) prev.onclick = () => { sfx.hover(); ti--; render(); };
      const next = v.querySelector('#t-next'); if (next) next.onclick = () => { sfx.pop(); ti++; render(); };
      const dn = v.querySelector('#t-done'); if (dn) dn.onclick = () => { sfx.click(); v.hidden = true; cfg.play(root, { onExit: () => showSensorRoom(root, { id, onExit }) }); };
    }
    render();
  }
}

// 방 id로 무대(챕터) 추정 — 배경 슬롯 재사용
function getChapterOf(id) { return id === 'basics' ? 'ch1' : 'ch2'; }
