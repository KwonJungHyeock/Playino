// provisioning.js — PING 핸드셰이크 + flashFirmware() 스텁 (§3, §7, 부록 B)
//
// 핸드셰이크: 연결 직후 PING -> 1.5초 내 'PLAYHOUSE v*' 수신 시 통과.
// 실패 -> 호출측에서 "보드 준비" 모달 -> flashFirmware()(스텁) 후 재시도.

import { encodePing, isIdent } from './protocol.js';

export const HANDSHAKE_TIMEOUT_MS = 1500;

/**
 * 열린 연결에 대해 핸드셰이크를 수행한다.
 * @param {import('./webserial.js').SerialConnection} connection
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs=1500]
 * @returns {Promise<{ok: boolean, version?: number, raw?: string, reason?: string}>}
 */
export function handshake(connection, { timeoutMs = HANDSHAKE_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    if (!connection || !connection.isOpen) {
      resolve({ ok: false, reason: 'not_open' });
      return;
    }

    let settled = false;
    let unsub = () => {};
    let timer = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsub();
      resolve(result);
    };

    unsub = connection.onLine((line) => {
      if (isIdent(line)) {
        const m = line.match(/v(\d+)/i);
        finish({ ok: true, version: m ? Number(m[1]) : undefined, raw: line.trim() });
      }
    });

    timer = setTimeout(() => finish({ ok: false, reason: 'timeout' }), timeoutMs);

    // PING 전송. 일부 보드는 reset 직후 READY 를 늦게 뱉으므로 곧장 PING.
    connection.write(encodePing()).catch((e) => {
      finish({ ok: false, reason: 'write_failed', error: String(e) });
    });
  });
}

/**
 * flashFirmware — 펌웨어 굽기 스텁 (부록 B).
 * 실제 굽기는 별도 작업자 담당(ESP=esptool-js, Uno=STK500).
 * 본 빌드에서는 흐름만 유지하도록 resolve() 만 한다.
 *
 * @param {string} board 보드 식별자 (예: 'uno')
 * @param {SerialPort} [port] 이미 선택된 포트(선택)
 * @returns {Promise<{flashed: boolean, stub: boolean}>}
 */
export async function flashFirmware(board = 'uno', port = null) {
  console.info(`[flashFirmware:STUB] board=${board} — 실제 굽기는 별도 작업자 담당. resolve() 만 수행.`);
  // TODO(별도 작업자): board 별 .hex/.bin 굽기 후 resolve. 프로토콜(부록 A) 준수 필수.
  return Promise.resolve({ flashed: true, stub: true });
}
