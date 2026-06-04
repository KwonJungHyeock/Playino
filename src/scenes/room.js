// room.js — 미션 룸 패널 (버튼 모드 + 코드 에디터 모드)
// 학습(코드 판정)은 보드 없이도 동작한다. 실물 반영은 best-effort.
// 방마다 미션 1~2개. 결과는 화면 미리보기 + (연결 시) 실물 LED 로 연동.

import { board } from '../app/board.js';
import { createEditor } from '../editor/codeEditor.js';
import { judge, parseLoop, execute } from '../editor/interpreter.js';
import eddieSvg from '../assets/eddie.svg?raw';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function openRoom(room, { onComplete, onClose }) {
  let mi = 0;
  let tab = 'button';
  let editor = null;
  let solved = false;

  const backdrop = document.createElement('div');
  backdrop.className = 'room-backdrop';
  backdrop.innerHTML = `
    <div class="room-panel">
      <header class="room-head">
        <div class="room-head-title">
          <span class="room-chip">${room.name}</span>
          <span id="room-mtitle"></span>
        </div>
        <div class="room-head-right">
          <span class="room-progress" id="room-mprog"></span>
          <button class="btn btn-sm room-skip" id="room-skip">건너뛰기 ⏭</button>
          <button class="room-x" id="room-x" title="닫기">✕</button>
        </div>
      </header>

      <div class="room-body">
        <div class="room-left">
          <div class="room-eddie">${eddieSvg}</div>
          <div class="room-lamp-big" id="room-lamp"><small>D${room.pin}</small></div>
          <div class="room-intro" id="room-intro"></div>
          <div class="room-story" id="room-story"></div>
        </div>

        <div class="room-right">
          <div class="room-tabs">
            <button class="room-tab active" data-tab="button">🔘 버튼 모드</button>
            <button class="room-tab" data-tab="code">⌨️ 코드 모드</button>
          </div>
          <div class="room-tabpane" id="room-pane"></div>
          <div class="room-feedback" id="room-fb"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const elMTitle = backdrop.querySelector('#room-mtitle');
  const elMProg = backdrop.querySelector('#room-mprog');
  const elIntro = backdrop.querySelector('#room-intro');
  const elStory = backdrop.querySelector('#room-story');
  const elPane = backdrop.querySelector('#room-pane');
  const elFb = backdrop.querySelector('#room-fb');
  const lamp = backdrop.querySelector('#room-lamp');
  const glow = backdrop.querySelector('#eddie-glow');

  backdrop.querySelector('#room-x').addEventListener('click', close);
  backdrop.querySelector('#room-skip').addEventListener('click', advance);
  backdrop.querySelectorAll('.room-tab').forEach((b) =>
    b.addEventListener('click', () => switchTab(b.dataset.tab)));

  const mission = () => room.missions[mi];

  function reflectLed(on) {
    lamp.style.boxShadow = ''; lamp.style.background = '';
    lamp.classList.toggle('on', on);
    if (glow) { glow.classList.remove('pulse'); if (on) { void glow.offsetWidth; glow.classList.add('pulse', 'held'); } else glow.classList.remove('held'); }
  }
  function reflectPwm(val) {
    const f = Math.max(0, Math.min(255, val)) / 255;
    lamp.classList.remove('on');
    if (f > 0.02) {
      lamp.style.background = `radial-gradient(circle, rgba(255,242,176,${0.35 + f * 0.6}), rgba(255,209,26,${0.3 + f * 0.7}) 70%)`;
      lamp.style.boxShadow = `0 0 ${8 + f * 34}px ${2 + f * 8}px rgba(255,209,26,${0.2 + f * 0.5})`;
    } else { lamp.style.background = ''; lamp.style.boxShadow = ''; }
    if (glow) { glow.classList.remove('pulse'); glow.classList.toggle('held', f > 0.4); }
  }

  function feedback(kind, html) { elFb.className = 'room-feedback ' + kind; elFb.innerHTML = html; }
  const hw = (fn) => { if (board.connected) { try { fn(); } catch (_) {} } else board.log('sys', '보드 미연결 — 화면으로만 반영'); };

  // ---- 성공 / 진행 ----
  function pass() {
    if (solved) return;
    solved = true;
    const last = mi >= room.missions.length - 1;
    feedback('ok', `
      <div class="fb-title">성공! 🎉 ${mission().title} 완료</div>
      <button class="btn primary" id="fb-next">${last ? `${room.name} 완료하고 나가기 ▶` : '다음 미션 ▶'}</button>
    `);
    elFb.querySelector('#fb-next').onclick = advance;
  }
  function advance() {
    const last = mi >= room.missions.length - 1;
    if (last) { close(); onComplete?.(); }
    else { mi += 1; solved = false; render(); }
  }

  // ---- 탭 ----
  function switchTab(t) {
    tab = t;
    backdrop.querySelectorAll('.room-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
    renderPane();
  }
  function renderPane() {
    if (editor) { try { editor.destroy?.(); } catch (_) {} editor = null; }
    elPane.innerHTML = '';
    if (tab === 'button') renderButtonPane();
    else renderCodePane();
  }

  // ---- 버튼 모드 ----
  function renderButtonPane() {
    const g = mission().goal;
    if (g === 'pwm') {
      elPane.innerHTML = `
        <p class="pane-help">슬라이더로 <b>밝기</b>를 정해보세요. (0~255)</p>
        <div class="pwm-row">
          <input type="range" min="0" max="255" value="128" id="pwm" />
          <span class="pwm-val" id="pwm-val">128</span>
        </div>
        <div class="btn-row"><button class="btn primary" id="b-apply">적용 ▶</button></div>`;
      const range = elPane.querySelector('#pwm');
      const valEl = elPane.querySelector('#pwm-val');
      range.oninput = () => { valEl.textContent = range.value; reflectPwm(+range.value); };
      reflectPwm(128);
      elPane.querySelector('#b-apply').onclick = () => {
        const v = +range.value;
        reflectPwm(v);
        hw(() => board.pwm(room.pin, v));
        if (v >= 1 && v <= 254) pass();
        else feedback('warn', '0이나 255 말고 그 사이 값으로 은은하게 만들어보세요!');
      };
    } else if (g === 'blink') {
      elPane.innerHTML = `
        <p class="pane-help">버튼으로 불을 <b>깜빡여</b> 보세요.</p>
        <div class="btn-row"><button class="btn primary" id="b-blink">불 깜빡이기 ▶</button></div>`;
      elPane.querySelector('#b-blink').onclick = async () => {
        feedback('', '깜빡이는 중…');
        for (let i = 0; i < 3; i++) {
          reflectLed(true); hw(() => board.digital(room.pin, true)); await wait(350);
          reflectLed(false); hw(() => board.digital(room.pin, false)); await wait(350);
        }
        pass();
      };
    } else {
      const wantOn = g !== 'off';
      elPane.innerHTML = `
        <p class="pane-help">스위치로 불을 ${wantOn ? '<b>켜</b>' : '<b>꺼</b>'} 보세요.</p>
        <div class="btn-row">
          <button class="btn" id="b-on">불 켜기 · L${room.pin}:1</button>
          <button class="btn" id="b-off">불 끄기 · L${room.pin}:0</button>
        </div>`;
      const set = (on) => {
        reflectLed(on);
        hw(() => board.digital(room.pin, on));
        backdrop.querySelector('#b-on').classList.toggle('on', on);
        backdrop.querySelector('#b-off').classList.toggle('on', !on);
        if (on === wantOn) pass();
      };
      elPane.querySelector('#b-on').onclick = () => set(true);
      elPane.querySelector('#b-off').onclick = () => set(false);
    }
  }

  // ---- 코드 모드 ----
  function renderCodePane() {
    elPane.innerHTML = `
      <div class="editor-host" id="editor-host"></div>
      <div class="code-actions">
        <button class="btn primary" id="b-upload">⚡ 업로드</button>
        <span class="code-hint">💡 ${mission().hint}</span>
      </div>`;
    editor = createEditor(elPane.querySelector('#editor-host'), mission().base);
    elPane.querySelector('#b-upload').onclick = () => {
      try {
        const code = editor.getDoc();
        const res = judge(code, room.pin, mission().goal);
        if (!res.ok) { feedback('warn', `아직이에요. ${res.reason}<br/><small>💡 ${mission().hint}</small>`); return; }
        board.log('sys', `코드 판정 통과 (${mission().goal})`);
        // 화면 반영
        const g = mission().goal;
        if (g === 'on') reflectLed(true);
        else if (g === 'off') reflectLed(false);
        else if (g === 'pwm') reflectPwm(res.summary.pwmVal ?? 128);
        // 실물 반영(best-effort)
        if (board.connected) {
          execute(parseLoop(code), room.pin, board, { onStep: (on, v) => (v != null ? reflectPwm(v) : reflectLed(on)) })
            .then(() => { if (g === 'on') reflectLed(true); if (g === 'pwm') reflectPwm(res.summary.pwmVal ?? 128); })
            .catch((e) => board.log('sys', '반영 실패(코드는 정답): ' + (e?.message ?? e)));
        } else board.log('sys', '보드 미연결 — 화면으로만 반영');
        pass();
      } catch (e) {
        feedback('warn', '오류가 났어요: ' + (e?.message ?? e));
      }
    };
  }

  // ---- 렌더 ----
  function render() {
    const m = mission();
    elMTitle.textContent = m.title;
    elMProg.textContent = `미션 ${mi + 1} / ${room.missions.length}`;
    elIntro.textContent = room.intro || '';
    elStory.innerHTML = `<b>${m.concept}</b> · ${m.story}`;
    feedback('', '');
    reflectLed(false);
    if (!board.connected) board.log('sys', `[${room.name}] 보드 미연결 — 코드 학습은 가능, 실물 반영만 생략됩니다.`);
    switchTab('button');
  }

  function close() {
    try { editor?.destroy?.(); } catch (_) {}
    backdrop.remove();
    onClose?.();
  }

  render();
}
