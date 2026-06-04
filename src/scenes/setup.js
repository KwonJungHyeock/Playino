// setup.js — 사용환경 준비 씬
// 학습 전 장비 점검: 브라우저 확인 -> 보드 연결 -> 펌웨어/통신(자동 굽기)
// -> 내장 LED(D13) 제어 테스트. 각 항목 완료가 체크리스트에 실시간 반영되고,
// 모두 완료되면 [학습 시작하기] 가 열린다. 외부 배선 없이 보드만으로 진행.

import { board } from '../app/board.js';
import { mountMonitor } from '../app/monitor.js';
import eddieSvg from '../assets/eddie.svg?raw';

const BUILTIN_LED = 13; // 보드 내장 LED ('L' 표시) — 외부 배선 불필요

const ITEMS = [
  { id: 'browser',  label: '브라우저 확인',   desc: 'Chrome / Edge 데스크톱 (WebSerial)' },
  { id: 'connect',  label: '보드 연결',       desc: 'USB 포트 선택' },
  { id: 'firmware', label: '펌웨어 & 통신',   desc: '보드 통신 확인 (필요 시 자동 굽기)' },
  { id: 'led13',    label: '내장 LED 테스트', desc: '보드 13번 LED 깜빡임 확인' },
];

const ICON = { todo: '⬜', doing: '⏳', done: '✅', fail: '⚠️' };

export function showSetup(root, { onDone }) {
  const status = { browser: 'todo', connect: 'todo', firmware: 'todo', led13: 'todo' };
  let led13Confirm = false;

  root.innerHTML = `
    <div class="scene setup scene-fade">
      <header class="app-header">
        <div class="brand"><span class="brand-dot"></span><strong>Eduino AI</strong> · 스타터 키트</div>
        <div class="phase-badge">사용환경 준비</div>
      </header>

      <div class="setup-body">
        <div class="setup-left">
          <div class="setup-eddie">${eddieSvg}</div>
          <div class="setup-speech" id="setup-speech">먼저 우리 장비가 잘 작동하는지 같이 점검하자! 💪</div>
        </div>

        <div class="setup-main">
          <h2 class="setup-title">학습 준비 체크리스트</h2>
          <ul class="checklist" id="checklist"></ul>
          <div class="setup-action" id="setup-action"></div>
          <button class="btn primary setup-go" id="setup-go" disabled>학습 시작하기 ▶</button>
          <div class="setup-skip-wrap"><button class="btn setup-skip" id="setup-skip">건너뛰기 ▶ (장비 준비 생략하고 학습방으로)</button></div>
        </div>

        <aside class="setup-monitor">
          <h3>시리얼 모니터</h3>
          <div id="setup-mon"></div>
        </aside>
      </div>
    </div>
  `;

  const speechEl = root.querySelector('#setup-speech');
  const checklistEl = root.querySelector('#checklist');
  const actionEl = root.querySelector('#setup-action');
  const goBtn = root.querySelector('#setup-go');

  mountMonitor(root.querySelector('#setup-mon'));
  goBtn.addEventListener('click', onDone);
  root.querySelector('#setup-skip').addEventListener('click', onDone);

  const speak = (t) => { speechEl.textContent = t; };

  function renderChecklist() {
    checklistEl.innerHTML = ITEMS.map((it) => `
      <li class="check-item ${status[it.id]}">
        <span class="check-icon">${ICON[status[it.id]]}</span>
        <span class="check-text"><b>${it.label}</b><small>${it.desc}</small></span>
      </li>`).join('');
  }

  function updateGo() {
    goBtn.disabled = !(status.browser === 'done' && status.connect === 'done'
      && status.firmware === 'done' && status.led13 === 'done');
    if (!goBtn.disabled) goBtn.classList.add('show');
  }

  function setStatus(id, s) { status[id] = s; renderChecklist(); renderAction(); updateGo(); }

  // ---- 액션 영역: 현재 단계에 맞는 버튼/안내 ----
  function renderAction() {
    actionEl.innerHTML = '';

    if (status.browser === 'fail') {
      actionEl.innerHTML = `<p class="muted">이 브라우저는 WebSerial 을 지원하지 않아요. Chrome 또는 Edge 데스크톱에서 다시 열어주세요. <small>(추후 Wokwi 시뮬레이터 지원 예정)</small></p>`;
      return;
    }
    if (status.connect !== 'done') {
      const dis = status.connect === 'doing' ? 'disabled' : '';
      actionEl.innerHTML = `<button class="btn primary" id="b-connect" ${dis}>${status.connect === 'doing' ? '연결 중…' : '보드 연결'}</button>`;
      if (!dis) actionEl.querySelector('#b-connect').onclick = doConnect;
      return;
    }
    if (status.firmware !== 'done') {
      const label = status.firmware === 'fail' ? '다시 굽기' : '펌웨어 굽기 (웹)';
      actionEl.innerHTML = `
        <button class="btn primary" id="b-flash">${label}</button>
        <div class="flash-progress" id="fp" hidden>
          <div class="bar"><div class="bar-fill" id="fb"></div></div>
          <div class="flash-stat" id="fs">대기 중…</div>
        </div>`;
      actionEl.querySelector('#b-flash').onclick = doFlash;
      return;
    }
    if (status.led13 !== 'done') {
      if (led13Confirm) {
        actionEl.innerHTML = `
          <p class="confirm-q">보드의 작은 LED(<b>L</b> 표시)가 깜빡였나요?</p>
          <div class="btn-row">
            <button class="btn primary" id="cy">네, 봤어요 ✅</button>
            <button class="btn" id="cn">아니요, 다시</button>
          </div>`;
        actionEl.querySelector('#cy').onclick = () => {
          setStatus('led13', 'done');
          speak('완벽해! 준비 끝 🎉 이제 진짜 거실로 가보자.');
        };
        actionEl.querySelector('#cn').onclick = () => {
          led13Confirm = false;
          setStatus('led13', 'todo');
          speak('안 보였구나. 보드가 잘 꽂혔는지 확인하고 다시 깜빡여줄게.');
        };
      } else {
        const dis = status.led13 === 'doing' ? 'disabled' : '';
        actionEl.innerHTML = `<button class="btn primary" id="b-blink" ${dis}>13번 LED 깜빡이기 💡</button>`;
        if (!dis) actionEl.querySelector('#b-blink').onclick = doBlink;
      }
      return;
    }
    actionEl.innerHTML = `<p class="muted">모든 준비 완료! 아래 [학습 시작하기]를 눌러주세요.</p>`;
  }

  // ---- 핸들러 ----
  async function doConnect() {
    setStatus('connect', 'doing');
    speak('USB 포트를 선택해줘!');
    try {
      const r = await board.connect();
      setStatus('connect', 'done');
      if (r.ok) {
        setStatus('firmware', 'done');
        speak('좋아, 보드랑 인사 끝! 이제 내장 LED를 깜빡여 보자. 💡');
      } else {
        setStatus('firmware', 'doing');
        speak('펌웨어가 없네. 내가 브라우저에서 바로 구워줄게! [펌웨어 굽기]를 눌러줘.');
      }
    } catch (e) {
      setStatus('connect', 'todo');
      speak('연결이 취소됐어. 다시 [보드 연결]을 눌러줘.');
      board.log('sys', '연결 취소/실패: ' + (e?.message ?? e));
    }
  }

  async function doFlash() {
    const fp = actionEl.querySelector('#fp');
    const fb = actionEl.querySelector('#fb');
    const fs = actionEl.querySelector('#fs');
    actionEl.querySelector('#b-flash').disabled = true;
    fp.hidden = false;
    speak('펌웨어 굽는 중… 케이블 뽑지 말고 잠깐만 기다려줘!');
    try {
      const r = await board.flash({
        onLog: (m) => { fs.textContent = m; },
        onProgress: (d, t) => {
          const pct = Math.round((d / t) * 100);
          fb.style.width = pct + '%';
          fs.textContent = `굽는 중… ${pct}% (${d}/${t} bytes)`;
        },
      });
      if (r.ok) {
        setStatus('firmware', 'done');
        speak('펌웨어 완료! 이제 내장 LED 테스트로 가자. 💡');
      } else {
        setStatus('firmware', 'fail');
        speak('굽긴 했는데 응답이 없어… 케이블/포트를 확인하고 다시 시도해줘.');
      }
    } catch (e) {
      setStatus('firmware', 'fail');
      speak('플래싱 실패: ' + (e?.message ?? e));
    }
  }

  async function doBlink() {
    setStatus('led13', 'doing');
    speak("보드에서 'L' 표시 옆 작은 LED를 봐! 네 번 깜빡일 거야.");
    try {
      await board.blink(BUILTIN_LED, 4, 250);
    } catch (e) {
      board.log('sys', 'LED 테스트 실패: ' + (e?.message ?? e));
    }
    led13Confirm = true;
    renderAction();
  }

  // ---- 시작 ----
  renderChecklist();
  if (board.isSupported()) {
    status.browser = 'done';
    // 이미 연결되어 있으면(앞 단계에서) 건너뛰기
    if (board.connected) { status.connect = 'done'; status.firmware = 'done'; }
  } else {
    status.browser = 'fail';
    speak('이런! 이 브라우저는 WebSerial 을 지원하지 않아. Chrome이나 Edge에서 열어줘.');
  }
  renderChecklist();
  renderAction();
  updateGo();
}
