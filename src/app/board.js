// board.js — 공유 보드 컨트롤러 (싱글턴)
// 모든 씬(setup / lesson …)이 이 모듈을 통해 보드를 제어한다.
// 시리얼 연결·핸드셰이크·웹 플래싱·핀 제어를 캡슐화하고,
// 라인/상태 이벤트를 구독자(시리얼 모니터 등)에게 브로드캐스트한다.

import { SerialConnection, isSupported as _isSupported } from '../serial/webserial.js';
import { handshake, flashFirmware } from '../serial/provisioning.js';
import { encodeDigitalWrite, encodePwm, parseLine, RESPONSE } from '../serial/protocol.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const hex = (n) => (n == null ? '—' : '0x' + n.toString(16).toUpperCase().padStart(4, '0'));

const conn = new SerialConnection();
let _version = null;

const lineSubs = new Set();
const stateSubs = new Set();

function emitLine(kind, text) {
  for (const f of lineSubs) { try { f(kind, text); } catch (e) { console.error(e); } }
}
function emitState(state, detail) {
  for (const f of stateSubs) { try { f(state, detail); } catch (e) { console.error(e); } }
}

conn.onLine((line) => {
  const p = parseLine(line);
  emitLine(p.kind === RESPONSE.ERR ? 'rx-err' : 'rx', line);
});
conn.onStateChange((s, d) => {
  if (s === 'closed' || s === 'error') _version = null;
  emitState(s, d);
});

export const board = {
  isSupported: _isSupported,
  get connected() { return conn.isOpen && _version != null; },
  get isOpen() { return conn.isOpen; },
  get version() { return _version; },
  get info() { return conn.getInfo(); },

  /** 시리얼 라인(tx/rx/sys) 구독. 반환값 호출 시 해제. */
  onLine(fn) { lineSubs.add(fn); return () => lineSubs.delete(fn); },
  /** 연결 상태(open/closed/error) 구독. */
  onState(fn) { stateSubs.add(fn); return () => stateSubs.delete(fn); },
  /** 씬에서 시스템/임의 로그를 모니터로 보낼 때. */
  log(kind, text) { emitLine(kind, text); },

  /** 포트 선택 + 오픈 + 핸드셰이크. (사용자 클릭 핸들러에서 호출) */
  async connect() {
    emitLine('sys', '포트 선택 중…');
    await conn.connect();                       // 취소 시 throw
    const i = conn.getInfo();
    emitLine('sys', `포트 열림 (VID ${hex(i?.usbVendorId)} / PID ${hex(i?.usbProductId)}).`);
    emitLine('tx', 'PING (최대 4회)');
    const r = await handshake(conn);
    if (r.ok) { _version = r.version; emitLine('sys', `핸드셰이크 통과: ${r.raw}`); }
    else { emitLine('sys', `핸드셰이크 실패 (${r.reason}) — 펌웨어가 필요할 수 있어요.`); }
    return r;
  },

  /** WebSerial 펌웨어 굽기 -> 재연결 -> 핸드셰이크. 기존 포트 재사용(선택창 없음). */
  async flash({ onProgress, onLog } = {}) {
    const port = conn.port;
    await conn.disconnect();
    _version = null;
    const res = await flashFirmware('uno', port, {
      onProgress,
      onLog: (m) => { onLog?.(m); emitLine('sys', m); },
    });
    await conn.attach(res.port || port);
    emitLine('sys', '보드 재시작 대기(약 1.6초)…');
    await delay(1600);
    emitLine('tx', 'PING (최대 4회)');
    const r = await handshake(conn);
    if (r.ok) { _version = r.version; emitLine('sys', `핸드셰이크 통과: ${r.raw}`); }
    return r;
  },

  async disconnect() { await conn.disconnect(); _version = null; },

  /** digitalWrite (write 가 멈춰도 UI 가 막히지 않도록 타임아웃 보호) */
  async digital(pin, on) {
    const c = encodeDigitalWrite(pin, on);
    await safeWrite(c);
    emitLine('tx', c);
  },
  /** analogWrite(PWM) */
  async pwm(pin, v) {
    const c = encodePwm(pin, v);
    await safeWrite(c);
    emitLine('tx', c);
  },
  /** 깜빡임 (내장 LED 테스트 등) — 항상 OFF 로 끝남 */
  async blink(pin, times = 4, period = 300) {
    for (let k = 0; k < times; k++) {
      await this.digital(pin, true); await delay(period);
      await this.digital(pin, false); await delay(period);
    }
    await this.digital(pin, false);
  },
};

// 시리얼 write 가 백프레셔 등으로 멈추면 1.2초 후 풀어주어 UI 가 얼지 않게 한다.
function safeWrite(cmd) {
  return Promise.race([
    conn.write(cmd),
    new Promise((_, rej) => setTimeout(() => rej(new Error('write timeout: ' + cmd)), 1200)),
  ]).catch((e) => { emitLine('sys', '⚠ 전송 지연/실패: ' + (e?.message ?? e)); });
}
