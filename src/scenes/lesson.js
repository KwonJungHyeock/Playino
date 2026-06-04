// lesson.js — 거실 레슨 씬 (다음 학습 스텝)
// 사용환경 준비에서 이어진 연결로 거실의 첫 불(D5 단색 LED)을 켠다.
// 스위치 ON -> 실물 LED 점등 + EDDIE success 글로우(같은 이벤트, §5.5).
// ※ 실물 배선상 거실 조명 = D5 (docs/HARDWARE.md, D2는 DHT11).

import { board } from '../app/board.js';
import { mountMonitor } from '../app/monitor.js';
import eddieSvg from '../assets/eddie.svg?raw';

const LIVING_PIN = 5;

export function showLesson(root, { onBack } = {}) {
  let ledOn = false;
  let done = false;

  root.innerHTML = `
    <div class="scene scene-fade">
      <header class="app-header">
        <div class="brand">
          <span class="brand-dot"></span><strong>Playino</strong> · PlayHouse
          <span class="crumb">거실</span>
        </div>
        <div class="phase-badge">레슨 1 · 거실 · <span id="progress">0 / 5</span></div>
      </header>

      <main class="layout">
        <section class="game-pane">
          <div class="stage">
            <div class="eddie-stage">${eddieSvg}</div>
            <div class="room-lamp" id="lamp"><small>D${LIVING_PIN}</small></div>
            <div class="room-card">
              <h2 id="mission">미션 · 거실 불 켜기</h2>
              <p id="story">집에 들어서니 거실이 깜깜해. 오른쪽 <b>벽 스위치</b>로 첫 불을 켜자!</p>
            </div>
          </div>
        </section>

        <aside class="practice-pane">
          <div class="panel-section">
            <h3>연결 상태</h3>
            <div class="card">
              <div class="conn-row">
                <span class="status-dot" id="dot"></span>
                <div>
                  <div class="conn-text" id="conn-text">확인 중…</div>
                  <div class="conn-sub" id="conn-sub">거실 조명 = D${LIVING_PIN}</div>
                </div>
              </div>
              <div class="btn-row" id="conn-actions"></div>
            </div>
          </div>

          <div class="panel-section">
            <h3>거실 스위치 (D${LIVING_PIN})</h3>
            <div class="card">
              <div class="btn-row">
                <button class="btn" id="b-on" disabled>불 켜기 · L${LIVING_PIN}:1</button>
                <button class="btn" id="b-off" disabled>불 끄기 · L${LIVING_PIN}:0</button>
              </div>
            </div>
          </div>

          <div class="panel-section">
            <h3>시리얼 모니터</h3>
            <div id="lesson-mon"></div>
          </div>
        </aside>
      </main>
    </div>
  `;

  const dot = root.querySelector('#dot');
  const connText = root.querySelector('#conn-text');
  const connSub = root.querySelector('#conn-sub');
  const connActions = root.querySelector('#conn-actions');
  const onBtn = root.querySelector('#b-on');
  const offBtn = root.querySelector('#b-off');
  const lamp = root.querySelector('#lamp');
  const glow = root.querySelector('#eddie-glow');
  const missionEl = root.querySelector('#mission');
  const storyEl = root.querySelector('#story');
  const progressEl = root.querySelector('#progress');

  mountMonitor(root.querySelector('#lesson-mon'));

  onBtn.addEventListener('click', () => setLed(true));
  offBtn.addEventListener('click', () => setLed(false));

  function reflectConnection() {
    const ok = board.connected;
    dot.className = 'status-dot ' + (ok ? 'connected' : '');
    connText.textContent = ok ? `연결됨 · PLAYHOUSE v${board.version ?? '?'}` : '미연결';
    onBtn.disabled = !ok;
    offBtn.disabled = !ok;
    connActions.innerHTML = ok ? '' : `<button class="btn primary" id="b-conn">보드 연결</button>`;
    if (!ok) {
      const b = connActions.querySelector('#b-conn');
      if (b) b.onclick = reconnect;
      connSub.textContent = '사용환경 준비에서 연결을 마치면 자동으로 이어져요.';
    } else {
      connSub.textContent = `거실 조명 = D${LIVING_PIN}`;
      reflectLed(ledOn);
    }
  }

  async function reconnect() {
    try {
      const r = await board.connect();
      reflectConnection();
      if (!r.ok) {
        board.log('sys', '핸드셰이크 실패 — [사용환경 준비]로 돌아가 펌웨어를 구워주세요.');
        if (onBack) {
          const b = document.createElement('button');
          b.className = 'btn';
          b.textContent = '사용환경 준비로';
          b.onclick = onBack;
          connActions.appendChild(b);
        }
      }
    } catch (e) { board.log('sys', '연결 취소/실패: ' + (e?.message ?? e)); }
  }

  async function setLed(on) {
    if (!board.connected) return;
    try {
      await board.digital(LIVING_PIN, on);
      ledOn = on;
      reflectLed(on);
      if (on && !done) complete();
    } catch (e) {
      board.log('sys', '전송 실패: ' + (e?.message ?? e));
    }
  }

  // 화면 LED + EDDIE success 글로우를 같은 이벤트에서 (§5.5 시그니처)
  function reflectLed(on) {
    lamp.classList.toggle('on', on);
    if (glow) {
      glow.classList.remove('pulse');
      if (on) { void glow.offsetWidth; glow.classList.add('pulse', 'held'); }
      else glow.classList.remove('held');
    }
    onBtn.classList.toggle('on', on);
    offBtn.classList.toggle('on', !on);
  }

  function complete() {
    done = true;
    progressEl.textContent = '1 / 5';
    missionEl.textContent = '거실 완료! 🎉';
    storyEl.innerHTML = '거실에 첫 불이 들어왔어요! EDDIE도 신났네요. <br/>다음 방은 곧 추가됩니다.';
    board.log('sys', '미션 달성: 거실 불 켜기 ✅ (1/5)');
  }

  // 초기 상태
  reflectConnection();
  board.onState(() => reflectConnection());
  if (board.connected) board.log('sys', '거실 레슨 시작 — 보드 연결 유지됨.');
}
