// webserial.js — Web Serial API(native) 래퍼 (§7)
// 포트 연결 · VID/PID 인식 · 라인 단위 read/write.
// WebSerial 은 Chrome/Edge 데스크톱에서만 동작. 미지원 시 isSupported()=false.

import { BAUD, LINE_TERMINATOR } from './protocol.js';

// 인식 대상 VID (§7). 필터에 걸리면 선택창이 해당 보드만 노출.
// (provisioning.js 의 웹 플래셔도 이 목록을 사용)
export const KNOWN_VENDORS = [
  { usbVendorId: 0x2341 }, // Arduino
  { usbVendorId: 0x2a03 }, // Arduino (구 VID)
  { usbVendorId: 0x1a86 }, // CH340 / CH9102 (호환 보드)
  { usbVendorId: 0x10c4 }, // CP210x (Silicon Labs)
  { usbVendorId: 0x0403 }, // FTDI
  { usbVendorId: 0x067b }, // Prolific PL2303
  { usbVendorId: 0x1b4f }, // SparkFun
  { usbVendorId: 0x239a }, // Adafruit
];

export function isSupported() {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/**
 * 라인 기반 시리얼 연결.
 * - connect(): 사용자 제스처에서 호출 (requestPort)
 * - write(line): '\n' 자동 부착
 * - onLine(cb): 수신 라인 콜백 등록
 */
export class SerialConnection {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this._readLoopPromise = null;
    this._textBuffer = '';
    this._lineHandlers = new Set();
    this._stateHandlers = new Set();
    this._closing = false;
    // 케이블을 뽑으면(물리적 제거) 즉시 감지 — isOpen 이 멈춰있지 않도록.
    if (isSupported()) {
      this._onDisconnect = (e) => { const p = e?.target || e?.port; if (p && p === this.port) this._lost(); };
      try { navigator.serial.addEventListener('disconnect', this._onDisconnect); } catch (_) {}
    }
  }

  // 물리적 분리: 더 이상 닫기를 await 하지 않고 상태만 정리 후 'closed' 통지
  _lost() {
    if (!this.port) return;
    this.reader = null; this.writer = null; this.port = null; this._textBuffer = ''; this._closing = false;
    this._emitState('closed', 'disconnect');
  }

  get isOpen() {
    return !!this.port && !!this.writer;
  }

  onLine(handler) {
    this._lineHandlers.add(handler);
    return () => this._lineHandlers.delete(handler);
  }

  onStateChange(handler) {
    this._stateHandlers.add(handler);
    return () => this._stateHandlers.delete(handler);
  }

  _emitState(state, detail) {
    for (const h of this._stateHandlers) {
      try { h(state, detail); } catch (e) { console.error(e); }
    }
  }

  _emitLine(line) {
    for (const h of this._lineHandlers) {
      try { h(line); } catch (e) { console.error(e); }
    }
  }

  /**
   * 포트 선택 + 오픈. 반드시 사용자 클릭 등 제스처 핸들러에서 호출.
   * @param {object} [opts]
   * @param {boolean} [opts.useFilters=true] 알려진 VID 만 노출할지
   */
  async connect({ useFilters = true } = {}) {
    if (!isSupported()) {
      throw new Error('WebSerial 미지원 브라우저입니다. Chrome/Edge 데스크톱을 사용하세요.');
    }
    if (this.isOpen) return this.port;

    const requestOpts = useFilters ? { filters: KNOWN_VENDORS } : {};
    const port = await navigator.serial.requestPort(requestOpts);
    return this.attach(port);
  }

  /** 이전에 권한이 부여된(getPorts) 포트로 선택창 없이 재연결 시도. 없으면 null. */
  async connectKnown() {
    if (!isSupported() || this.isOpen) return this.isOpen ? this.port : null;
    const ports = (await navigator.serial.getPorts?.()) || [];
    if (!ports.length) return null;
    // 알려진 VID 우선
    const known = ports.find((p) => {
      const id = p.getInfo?.() ?? {};
      return KNOWN_VENDORS.some((v) => v.usbVendorId === id.usbVendorId);
    }) || ports[0];
    return this.attach(known);
  }

  /**
   * 이미 권한이 부여된(또는 선택된) 포트로 런타임 연결한다.
   * 닫힌 포트면 열고, 텍스트 read/write 스트림을 세팅한다.
   * 플래싱 후 같은 포트를 추가 선택창 없이 재연결할 때 사용.
   */
  async attach(port) {
    if (this.isOpen) return this.port;
    this.port = port;
    if (!port.readable) await this._openWithRetry(port);
    this._closing = false;
    this._setupWriter();
    this._readLoopPromise = this._readLoop();
    this._emitState('open', this.getInfo());
    return this.port;
  }

  /** 포트 open 을 일시 오류(직전 해제 직후 등)에 대비해 짧게 재시도한다. */
  async _openWithRetry(port, tries = 3) {
    for (let i = 1; i <= tries; i++) {
      try { await port.open({ baudRate: BAUD }); return; }
      catch (e) {
        if (i >= tries) throw e;
        await new Promise((r) => setTimeout(r, 350 * i));
      }
    }
  }

  getInfo() {
    if (!this.port) return null;
    const info = this.port.getInfo?.() ?? {};
    return {
      usbVendorId: info.usbVendorId,
      usbProductId: info.usbProductId,
    };
  }

  _setupWriter() {
    const encoder = new TextEncoderStream();
    encoder.readable.pipeTo(this.port.writable).catch((e) => {
      if (!this._closing) console.error('writer pipe error', e);
    });
    this._encoderStream = encoder;
    this.writer = encoder.writable.getWriter();
  }

  /** 한 줄 전송 ('\n' 자동 부착). raw=true 면 그대로 전송. */
  async write(line, { raw = false } = {}) {
    if (!this.writer) throw new Error('포트가 열려있지 않습니다.');
    const payload = raw ? line : line + LINE_TERMINATOR;
    await this.writer.write(payload);
    return payload;
  }

  async _readLoop() {
    const decoder = new TextDecoderStream();
    const readableClosed = this.port.readable.pipeTo(decoder.writable).catch((e) => {
      if (!this._closing) console.error('reader pipe error', e);
    });
    this._decoderStream = decoder;
    this._readableClosed = readableClosed;
    this.reader = decoder.readable.getReader();

    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) this._ingest(value);
      }
    } catch (e) {
      if (!this._closing) {
        console.error('read loop error', e);
        this._emitState('error', e);
      }
    }
  }

  /** 수신 청크를 줄 단위로 분해 */
  _ingest(chunk) {
    this._textBuffer += chunk;
    let idx;
    while ((idx = this._textBuffer.indexOf('\n')) >= 0) {
      let line = this._textBuffer.slice(0, idx);
      this._textBuffer = this._textBuffer.slice(idx + 1);
      line = line.replace(/\r$/, '');
      if (line.length === 0) continue;
      this._emitLine(line);
    }
  }

  async disconnect() {
    this._closing = true;
    try {
      if (this.reader) {
        await this.reader.cancel().catch(() => {});
        this.reader.releaseLock?.();
      }
      if (this.writer) {
        await this.writer.close().catch(() => {});
        this.writer.releaseLock?.();
      }
      if (this._readableClosed) await this._readableClosed.catch(() => {});
      if (this.port) await this.port.close().catch(() => {});
    } finally {
      this.reader = null;
      this.writer = null;
      this.port = null;
      this._textBuffer = '';
      this._emitState('closed');
    }
  }
}
