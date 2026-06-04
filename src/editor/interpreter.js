// interpreter.js — "업로드" 프로토타입 (§6)
// 실제 컴파일 X. loop() 에서 digitalWrite(pin,HIGH|LOW)·delay(ms) 를 추출해
// 명령 시퀀스로 변환하고, 목표(goal)를 판정한다. 깜빡임 패턴이면 반복 실행.

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** loop() 본문에서 write/delay 토큰을 추출 */
export function parseLoop(code) {
  const m = code.match(/void\s+loop\s*\(\s*\)\s*\{([\s\S]*)\}/);
  const body = m ? m[1] : code;
  const re = /digitalWrite\s*\(\s*(\d+)\s*,\s*(HIGH|LOW|1|0)\s*\)|delay\s*\(\s*(\d+)\s*\)/g;
  const tokens = [];
  let t;
  while ((t = re.exec(body))) {
    if (t[1] !== undefined && t[2] !== undefined) {
      tokens.push({ type: 'write', pin: Number(t[1]), val: (t[2] === 'HIGH' || t[2] === '1') ? 1 : 0 });
    } else if (t[3] !== undefined) {
      tokens.push({ type: 'delay', ms: Number(t[3]) });
    }
  }
  return tokens;
}

/** 토큰 분석 → 목표 판정용 요약 */
export function analyze(tokens, pin) {
  const writes = tokens.filter((t) => t.type === 'write' && t.pin === pin);
  const delays = tokens.filter((t) => t.type === 'delay');
  const finalVal = writes.length ? writes[writes.length - 1].val : null;
  const hasHigh = writes.some((w) => w.val === 1);
  const hasLow = writes.some((w) => w.val === 0);
  const blink = hasHigh && hasLow && delays.length >= 2;
  return { writes, delays, finalVal, hasHigh, hasLow, blink };
}

/**
 * 목표 판정.
 * @returns {{ok:boolean, reason:string, summary:object}}
 */
export function judge(code, pin, goal) {
  const tokens = parseLoop(code);
  const s = analyze(tokens, pin);
  if (s.writes.length === 0) {
    return { ok: false, reason: `${pin}번 핀을 제어하는 digitalWrite 가 안 보여요.`, summary: s, tokens };
  }
  if (goal === 'on') {
    return s.finalVal === 1
      ? { ok: true, reason: '불이 켜진 상태로 끝나요! 👍', summary: s, tokens }
      : { ok: false, reason: '마지막에 불이 꺼져 있어요. HIGH 로 끝나야 해요.', summary: s, tokens };
  }
  if (goal === 'off') {
    return s.finalVal === 0
      ? { ok: true, reason: '불이 꺼진 상태로 끝나요! 👍', summary: s, tokens }
      : { ok: false, reason: '마지막에 불이 켜져 있어요. LOW 로 끝나야 해요.', summary: s, tokens };
  }
  if (goal === 'blink') {
    return s.blink
      ? { ok: true, reason: 'HIGH·LOW 와 delay 로 깜빡여요! ✨', summary: s, tokens }
      : { ok: false, reason: 'HIGH·LOW 를 번갈아 쓰고 delay 를 2번 이상 넣어야 깜빡여요.', summary: s, tokens };
  }
  return { ok: false, reason: '알 수 없는 목표', summary: s, tokens };
}

/**
 * 토큰 시퀀스를 실물 보드로 실행. board.digital(pin,on) 사용.
 * 깜빡임(블링크) 패턴이면 loops 회 반복, 정적이면 1회.
 * @param {object} board  src/app/board.js
 */
export async function execute(tokens, pin, board, { loops = 3, onStep } = {}) {
  const hasDelay = tokens.some((t) => t.type === 'delay');
  const passes = hasDelay ? loops : 1;
  for (let l = 0; l < passes; l++) {
    for (const t of tokens) {
      if (t.type === 'write' && t.pin === pin) {
        await board.digital(pin, t.val === 1);
        onStep?.(t.val === 1);
      } else if (t.type === 'delay') {
        await delay(Math.min(t.ms, 1500));
      }
    }
  }
}
