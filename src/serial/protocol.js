// protocol.js — Playino · PlayHouse 시리얼 프로토콜 (§3)
// 라인 단위 ASCII, '\n' 종결, 115200 baud.
//
// H -> B (호스트 -> 보드)
//   PING                 핸드셰이크
//   L<pin>:<0|1>         digitalWrite (예: L2:1)
//   P<pin>:<0-255>       analogWrite(PWM)
//   U<trig>:<echo>       초음파(HC-SR04) 거리 측정 → US:<cm>
//
// B -> H (보드 -> 호스트)
//   READY                부팅 완료
//   PLAYHOUSE v<n>       식별 (핸드셰이크 응답)
//   OK                   ACK
//   ERR:<msg>            오류

export const BAUD = 115200;
export const LINE_TERMINATOR = '\n';

// ---- 인코딩 (H -> B) -------------------------------------------------------

/** 핸드셰이크 요청 */
export function encodePing() {
  return 'PING';
}

/** digitalWrite: L<pin>:<0|1> */
export function encodeDigitalWrite(pin, value) {
  const v = value ? 1 : 0;
  return `L${pin}:${v}`;
}

/** analogWrite(PWM): P<pin>:<0-255> */
export function encodePwm(pin, value) {
  const v = Math.max(0, Math.min(255, Math.round(value)));
  return `P${pin}:${v}`;
}

/** tone(부저): T<pin>:<freq>[,<ms>] */
export function encodeTone(pin, freq, ms = 220) {
  return `T${pin}:${Math.max(0, Math.round(freq))},${Math.max(0, Math.round(ms))}`;
}

/** analogRead: A<ch> (ch 0-7) → 응답 A<ch>:<0-1023> */
export function encodeAnalogRead(ch) {
  return `A${ch}`;
}

/** digitalRead: R<pin> → 응답 R<pin>:<0|1> */
export function encodeDigitalRead(pin) {
  return `R${pin}`;
}

/** 초음파(HC-SR04): U<trig>:<echo> → Trig 펄스 후 Echo 폭 측정 → 응답 US:<cm> (에코 없음 -1) */
export function encodeUltrasonic(trig, echo) {
  return `U${trig}:${echo}`;
}

// ---- 디코딩 (B -> H) -------------------------------------------------------

export const RESPONSE = Object.freeze({
  READY: 'ready',
  IDENT: 'ident', // PLAYHOUSE v<n>
  OK: 'ok',
  ERR: 'err',
  UNKNOWN: 'unknown',
});

const IDENT_RE = /^PLAYHOUSE\s+v(\d+)/i;

/**
 * 보드에서 받은 한 줄을 구조화한다.
 * @returns {{kind: string, raw: string, version?: number, message?: string}}
 */
export function parseLine(line) {
  const raw = (line ?? '').trim();

  if (raw === 'READY') return { kind: RESPONSE.READY, raw };
  if (raw === 'OK') return { kind: RESPONSE.OK, raw };

  const ident = raw.match(IDENT_RE);
  if (ident) {
    return { kind: RESPONSE.IDENT, raw, version: Number(ident[1]) };
  }

  if (raw.startsWith('ERR:')) {
    return { kind: RESPONSE.ERR, raw, message: raw.slice(4) };
  }

  return { kind: RESPONSE.UNKNOWN, raw };
}

/** PLAYHOUSE v* 식별 라인인지 (핸드셰이크 판정용) */
export function isIdent(line) {
  return IDENT_RE.test((line ?? '').trim());
}
