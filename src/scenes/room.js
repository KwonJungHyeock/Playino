// room.js — 미션 룸 패널 (버튼 모드 + 코드 에디터 모드)
// 방의 장치(접촉 포인트)와 상호작용하면 열린다. 방마다 미션 1~2개.
// 버튼/코드 어느 쪽이든 결과가 실물 LED + 미리보기 + EDDIE success 로 연동.

import { board } from '../app/board.js';
import { createEditor } from '../editor/codeEditor.js';
import { judge, parseLoop, execute } from '../editor/interpreter.js';
import eddieSvg from '../assets/eddie.svg?raw';

/**
 * @param {object} room  rooms.js 의 방 정의
 * @param {{onComplete:()=>void, onClose:()=>void}} cbs
 */
export function openRoom(room, { onComplete, onClose }) {
  let mi = 0;                 // 현재 미션 인덱스
  let tab = 'button';         // 'button' | 'code'
  let editor = null;
  let ledOn = false;
  let solved = false;         // 현재 미션 해결됨

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
          <button class="room-x" id="room-x" title="닫기">✕</button>
        </div>
      </header>

      <div class="room-body">
        <div class="room-left">
          <div class="room-eddie">${eddieSvg}</div>
          <div class="room-lamp-big" id="room-lamp"><small>D${room.pin}</small></div>
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
  const elStory = backdrop.querySelector('#room-story');
  const elPane = backdrop.querySelector('#room-pane');
  const elFb = backdrop.querySelector('#room-fb');
  const lamp = backdrop.querySelector('#room-lamp');
  const glow = backdrop.querySelector('#eddie-glow');

  backdrop.querySelector('#room-x').addEventListener('click', () => close());
  backdrop.querySelectorAll('.room-tab').forEach((b) =>
    b.addEventListener('click', () => switchTab(b.dataset.tab)));

  function mission() { return room.missions[mi]; }

  function reflectLed(on) {
    ledOn = on;
    lamp.classList.toggle('on', on);
    if (glow) {
      glow.classList.remove('pulse');
      if (on) { void glow.offsetWidth; glow.classList.add('pulse', 'held'); }
      else glow.classList.remove('held');
    }
  }

  function notConnectedGuard() {
    if (board.connected) return false;
    elFb.className = 'room-feedback warn';
    elFb.innerHTML = '보드 연결이 필요해요. [사용환경 준비]에서 연결을 마쳐주세요.';
    return true;
  }

  function feedback(kind, html) {
    elFb.className = 'room-feedback ' + kind;
    elFb.innerHTML = html;
  }

  // ---- 미션 성공 처리 ----
  function pass() {
    if (solved) return;
    solved = true;
    reflectLed(mission().goal !== 'off');
    const last = mi >= room.missions.length - 1;
    feedback('ok', `
      <div class="fb-title">성공! 🎉 ${mission().title} 완료</div>
      <button class="btn primary" id="fb-next">${last ? `${room.name} 완료하고 나가기 ▶` : '다음 미션 ▶'}</button>
    `);
    elFb.querySelector('#fb-next').onclick = () => {
      if (last) { close(); onComplete?.(); }
      else { mi += 1; solved = false; render(); }
    };
  }

  // ---- 탭 ----
  function switchTab(t) {
    tab = t;
    backdrop.querySelectorAll('.room-tab').forEach((b) =>
      b.classList.toggle('active', b.dataset.tab === t));
    renderPane();
  }

  function renderPane() {
    if (editor) { try { editor.destroy?.(); } catch (_) {} editor = null; }
    elPane.innerHTML = '';
    if (tab === 'button') renderButtonPane();
    else renderCodePane();
  }

  // 버튼 모드
  function renderButtonPane() {
    const g = mission().goal;
    if (g === 'blink') {
      elPane.innerHTML = `
        <p class="pane-help">버튼으로 불을 <b>깜빡여</b> 보세요. (3번 깜빡임)</p>
        <div class="btn-row"><button class="btn primary" id="b-blink">불 깜빡이기 ▶</button></div>`;
      elPane.querySelector('#b-blink').onclick = async () => {
        if (notConnectedGuard()) return;
        feedback('', '깜빡이는 중…');
        try {
          for (let i = 0; i < 3; i++) {
            await board.digital(room.pin, true); reflectLed(true); await wait(350);
            await board.digital(room.pin, false); reflectLed(false); await wait(350);
          }
          pass();
        } catch (e) { feedback('warn', '전송 실패: ' + (e?.message ?? e)); }
      };
    } else {
      const wantOn = g !== 'off';
      elPane.innerHTML = `
        <p class="pane-help">스위치로 불을 ${wantOn ? '<b>켜</b>' : '<b>꺼</b>'} 보세요.</p>
        <div class="btn-row">
          <button class="btn" id="b-on">불 켜기 · L${room.pin}:1</button>
          <button class="btn" id="b-off">불 끄기 · L${room.pin}:0</button>
        </div>`;
      const set = async (on) => {
        if (notConnectedGuard()) return;
        try {
          await board.digital(room.pin, on);
          reflectLed(on);
          backdrop.querySelector('#b-on').classList.toggle('on', on);
          backdrop.querySelector('#b-off').classList.toggle('on', !on);
          if (on === wantOn) pass();
        } catch (e) { feedback('warn', '전송 실패: ' + (e?.message ?? e)); }
      };
      elPane.querySelector('#b-on').onclick = () => set(true);
      elPane.querySelector('#b-off').onclick = () => set(false);
    }
  }

  // 코드 모드
  function renderCodePane() {
    elPane.innerHTML = `
      <div class="editor-host" id="editor-host"></div>
      <div class="code-actions">
        <button class="btn primary" id="b-upload">⚡ 업로드</button>
        <span class="code-hint">💡 ${mission().hint}</span>
      </div>`;
    const host = elPane.querySelector('#editor-host');
    editor = createEditor(host, mission().base);
    elPane.querySelector('#b-upload').onclick = async () => {
      if (notConnectedGuard()) return;
      const code = editor.getDoc();
      const res = judge(code, room.pin, mission().goal);
      if (!res.ok) { feedback('warn', `아직이에요. ${res.reason}<br/><small>💡 ${mission().hint}</small>`); return; }
      feedback('', '업로드 중… 보드에 반영합니다.');
      try {
        await execute(parseLoop(code), room.pin, board, { onStep: (on) => reflectLed(on) });
        // 정적(켜기/끄기)이면 최종 상태 유지
        if (mission().goal === 'on') reflectLed(true);
        if (mission().goal === 'off') reflectLed(false);
        pass();
      } catch (e) { feedback('warn', '전송 실패: ' + (e?.message ?? e)); }
    };
  }

  // ---- 미션 렌더 ----
  function render() {
    const m = mission();
    elMTitle.textContent = m.title;
    elMProg.textContent = `미션 ${mi + 1} / ${room.missions.length}`;
    elStory.innerHTML = `<b>${m.concept}</b> · ${m.story}`;
    elFb.className = 'room-feedback';
    elFb.innerHTML = '';
    reflectLed(false);
    switchTab('button');
  }

  function close() {
    try { editor?.destroy?.(); } catch (_) {}
    backdrop.remove();
    onClose?.();
  }

  if (notConnectedGuard()) { /* 연결 경고만 표시, 그래도 패널은 열림 */ }
  render();
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
