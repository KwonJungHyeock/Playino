// main.js — Playino · PlayHouse 거실 레슨
// 구현 순서 §9: STEP 1(Scaffold) + STEP 2(시리얼 코어) 까지.
// 이 화면은 STEP 2 검증용 하네스다:
//   연결 -> PING 핸드셰이크 -> L2:1 / L2:0 로 실물 D2 LED 토글 -> 시리얼 모니터.
//   (여기서 멈추고 사람이 실물 LED 를 확인한다 — §9.2)

import { SerialConnection, isSupported } from './serial/webserial.js';
import { handshake, flashFirmware } from './serial/provisioning.js';
import { encodeDigitalWrite, parseLine, RESPONSE } from './serial/protocol.js';
import eddieSvg from './assets/eddie.svg?raw';

// 거실 = D2 (§0). 본 검증은 거실 핀에 고정.
const LIVING_PIN = 2;

const conn = new SerialConnection();
let ledOn = false;

// ---- 부팅 ------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  renderStage();
  renderPanel();
  bindSerialEvents();
  if (!isSupported()) {
    setStatus('error', 'WebSerial 미지원', 'Chrome / Edge 데스크톱에서 열어주세요. (이후 STEP 9 에서 Wokwi 폴백)');
    log('sys', 'navigator.serial 미지원 브라우저 — 실물 연결 불가.');
  } else {
    log('sys', 'WebSerial 지원됨. [보드 연결]을 눌러 포트를 선택하세요.');
  }
});

// ---- 좌측 스테이지 (게임 캔버스 자리) -------------------------------
function renderStage() {
  const stage = document.getElementById('stage');
  stage.innerHTML = `
    <div class="eddie-stage" id="eddie-mount">${eddieSvg}</div>
    <div class="room-lamp" id="room-lamp"><small>D2</small></div>
    <div class="room-card">
      <h2>거실 · 시리얼 코어 검증</h2>
      <p>오른쪽 패널에서 보드를 연결하고 <b>불 켜기 / 끄기</b>로 실물 D2 LED 를 토글하세요.
         <br/>LED 와 EDDIE의 success 글로우가 <b>같은 이벤트</b>에서 켜집니다.</p>
    </div>
  `;
}

// ---- 우측 연습 패널 -------------------------------------------------
function renderPanel() {
  const root = document.getElementById('panel-root');
  root.innerHTML = `
    <div class="panel-section">
      <h3>연결 상태</h3>
      <div class="card">
        <div class="conn-row">
          <span class="status-dot" id="status-dot"></span>
          <div>
            <div class="conn-text" id="status-text">미연결</div>
            <div class="conn-sub" id="status-sub">115200 baud · 거실 핀 D${LIVING_PIN}</div>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn primary" id="btn-connect">보드 연결</button>
          <button class="btn" id="btn-disconnect" disabled>연결 해제</button>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <h3>거실 불 (D${LIVING_PIN})</h3>
      <div class="card">
        <div class="btn-row">
          <button class="btn" id="btn-on" disabled>불 켜기 · L${LIVING_PIN}:1</button>
          <button class="btn" id="btn-off" disabled>불 끄기 · L${LIVING_PIN}:0</button>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <h3>시리얼 모니터</h3>
      <div class="monitor-tools">
        <span class="hint">TX 파랑 · RX 초록 · 오류 빨강</span>
        <button class="btn" id="btn-clear">지우기</button>
      </div>
      <div class="serial-monitor" id="serial-monitor">
        <span class="mon-empty">— 로그 없음 —</span>
      </div>
    </div>
  `;

  document.getElementById('btn-connect').addEventListener('click', onConnect);
  document.getElementById('btn-disconnect').addEventListener('click', onDisconnect);
  document.getElementById('btn-on').addEventListener('click', () => setLed(true));
  document.getElementById('btn-off').addEventListener('click', () => setLed(false));
  document.getElementById('btn-clear').addEventListener('click', clearMonitor);
}

// ---- 시리얼 이벤트 --------------------------------------------------
function bindSerialEvents() {
  conn.onLine((line) => {
    const parsed = parseLine(line);
    log(parsed.kind === RESPONSE.ERR ? 'rx-err' : 'rx', line);
  });
  conn.onStateChange((state) => {
    if (state === 'closed') reflectDisconnected();
    if (state === 'error') setStatus('error', '연결 오류', '포트 통신 중 문제가 발생했습니다.');
  });
}

// ---- 연결 / 핸드셰이크 ----------------------------------------------
async function onConnect() {
  if (!isSupported()) return;
  setStatus('connecting', '포트 선택 중…', '브라우저 팝업에서 보드를 선택하세요.');
  try {
    await conn.connect();
  } catch (e) {
    // 사용자가 취소하거나 포트 없음
    setStatus('', '미연결', '연결이 취소되었거나 포트를 찾지 못했습니다.');
    log('sys', `연결 실패: ${e.message ?? e}`);
    return;
  }

  const info = conn.getInfo();
  log('sys', `포트 열림 (VID ${hex(info?.usbVendorId)} / PID ${hex(info?.usbProductId)}). PING 전송…`);
  log('tx', 'PING');
  setStatus('connecting', '핸드셰이크…', 'PLAYHOUSE 응답 대기 (1.5초)');

  const result = await handshake(conn);
  if (result.ok) {
    setStatus('connected', `연결됨 · PLAYHOUSE v${result.version ?? '?'}`, `거실 핀 D${LIVING_PIN} 준비 완료`);
    log('sys', `핸드셰이크 통과: ${result.raw}`);
    enableControls(true);
  } else {
    log('sys', `핸드셰이크 실패 (${result.reason}). "보드 준비" 모달을 엽니다.`);
    openBoardPrepModal();
  }
}

async function onDisconnect() {
  await conn.disconnect();
}

function reflectDisconnected() {
  enableControls(false);
  ledOn = false;
  reflectLed(false);
  setStatus('', '미연결', '115200 baud · 거실 핀 D' + LIVING_PIN);
  log('sys', '연결 해제됨.');
}

// ---- LED 토글 (검증 핵심) -------------------------------------------
async function setLed(on) {
  if (!conn.isOpen) return;
  const cmd = encodeDigitalWrite(LIVING_PIN, on);
  try {
    await conn.write(cmd);
    log('tx', cmd);
    ledOn = on;
    reflectLed(on);
  } catch (e) {
    log('sys', `전송 실패: ${e.message ?? e}`);
  }
}

// 화면 LED + EDDIE success 글로우를 같은 이벤트에서 갱신 (§5.5 signature)
function reflectLed(on) {
  const lamp = document.getElementById('room-lamp');
  if (lamp) lamp.classList.toggle('on', on);

  const glow = document.getElementById('eddie-glow');
  if (glow) {
    glow.classList.remove('pulse');
    if (on) {
      // reflow 후 펄스 + 점등 유지
      void glow.offsetWidth;
      glow.classList.add('pulse', 'held');
    } else {
      glow.classList.remove('held');
    }
  }

  const onBtn = document.getElementById('btn-on');
  const offBtn = document.getElementById('btn-off');
  if (onBtn) onBtn.classList.toggle('on', on);
  if (offBtn) offBtn.classList.toggle('on', !on);
}

// ---- "보드 준비" 모달 (핸드셰이크 실패 시) ---------------------------
function openBoardPrepModal() {
  setStatus('error', '보드 응답 없음', '펌웨어가 없거나 다른 포트일 수 있어요.');
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h3>보드 준비 (최초 1회)</h3>
      <p>보드에서 <code>PLAYHOUSE v*</code> 응답이 오지 않았어요.
         펌웨어를 굽고 다시 핸드셰이크를 시도합니다.
         <br/><small>* 실제 굽기는 별도 작업자 담당 — 현재는 스텁으로 흐름만 유지합니다.</small></p>
      <div class="modal-actions">
        <button class="btn" id="modal-cancel">닫기</button>
        <button class="btn primary" id="modal-flash">펌웨어 준비 후 재시도</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  backdrop.querySelector('#modal-cancel').addEventListener('click', () => backdrop.remove());
  backdrop.querySelector('#modal-flash').addEventListener('click', async () => {
    log('sys', 'flashFirmware() 스텁 호출…');
    await flashFirmware('uno', conn.port);
    log('sys', 'flashFirmware() resolve(). 핸드셰이크 재시도…');
    backdrop.remove();
    log('tx', 'PING');
    setStatus('connecting', '핸드셰이크 재시도…', 'PLAYHOUSE 응답 대기');
    const retry = await handshake(conn);
    if (retry.ok) {
      setStatus('connected', `연결됨 · PLAYHOUSE v${retry.version ?? '?'}`, `거실 핀 D${LIVING_PIN} 준비 완료`);
      log('sys', `핸드셰이크 통과: ${retry.raw}`);
      enableControls(true);
    } else {
      log('sys', `재시도 실패 (${retry.reason}). 펌웨어/포트를 확인하세요.`);
      setStatus('error', '핸드셰이크 실패', '실물 펌웨어가 부록 A 프로토콜을 따르는지 확인하세요.');
    }
  });
}

// ---- 상태 / 컨트롤 / 모니터 헬퍼 ------------------------------------
function setStatus(kind, text, sub) {
  const dot = document.getElementById('status-dot');
  const t = document.getElementById('status-text');
  const s = document.getElementById('status-sub');
  if (dot) dot.className = 'status-dot ' + (kind || '');
  if (t) t.textContent = text;
  if (s && sub != null) s.textContent = sub;
}

function enableControls(connected) {
  document.getElementById('btn-connect').disabled = connected;
  document.getElementById('btn-disconnect').disabled = !connected;
  document.getElementById('btn-on').disabled = !connected;
  document.getElementById('btn-off').disabled = !connected;
  if (connected) reflectLed(ledOn);
}

function log(kind, text) {
  const mon = document.getElementById('serial-monitor');
  if (!mon) return;
  const empty = mon.querySelector('.mon-empty');
  if (empty) empty.remove();

  const cls = {
    tx: 'mon-tx', rx: 'mon-rx', 'rx-err': 'mon-rx err', sys: 'mon-sys',
  }[kind] || 'mon-sys';
  const tag = { tx: '→', rx: '←', 'rx-err': '←', sys: '·' }[kind] || '·';

  const row = document.createElement('div');
  row.className = 'mon-line';
  row.innerHTML = `<span class="mon-time">${now()}</span><span class="${cls}">${tag} ${escapeHtml(text)}</span>`;
  mon.appendChild(row);
  mon.scrollTop = mon.scrollHeight;
}

function clearMonitor() {
  const mon = document.getElementById('serial-monitor');
  if (mon) mon.innerHTML = '<span class="mon-empty">— 로그 없음 —</span>';
}

// ---- 유틸 -----------------------------------------------------------
function now() {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}
function hex(n) {
  return n == null ? '—' : '0x' + n.toString(16).toUpperCase().padStart(4, '0');
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
