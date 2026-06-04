// rooms.js — PlayHouse 방 & 미션 정의 (콘텐츠)
// 실물 배선(docs/HARDWARE.md): 단색 LED = D5/D9/D10/D11.
//   현관=D5, 거실=D9, 주방=D10, 욕실=D11. 침실=DHT11(센서) → 추후 잠금 해제.
// goal: 'on'(켜기) | 'off'(끄기) | 'blink'(깜빡) | 'pwm'(밝기)

const setup = (pin) => `void setup() {\n  pinMode(${pin}, OUTPUT);\n}\n\n`;

const mOn = (pin) => ({
  id: 'on', title: '불 켜기', goal: 'on', concept: 'digitalWrite',
  story: '핀에 전기를 보내면(HIGH) 불이 켜져!',
  hint: `digitalWrite(${pin}, HIGH) 는 ${pin}번 핀에 전기를 보내 불을 켭니다.`,
  base: setup(pin) + `void loop() {\n  digitalWrite(${pin}, HIGH);   // 불 켜기\n}\n`,
});
const mBlink = (pin) => ({
  id: 'blink', title: '깜빡여 신호 보내기', goal: 'blink', concept: 'delay',
  story: '불을 깜빡여서 "나 여기 있어!" 신호를 보내자. delay 숫자를 바꿔봐!',
  hint: 'HIGH → delay → LOW → delay 를 반복하면 깜빡여요.',
  base: setup(pin) + `void loop() {\n  digitalWrite(${pin}, HIGH);\n  delay(500);\n  digitalWrite(${pin}, LOW);\n  delay(500);\n}\n`,
});
const mPwm = (pin) => ({
  id: 'pwm', title: '밝기 조절하기', goal: 'pwm', concept: 'analogWrite',
  story: '0~255 사이 값으로 밝기를 정할 수 있어. 은은한 무드등을 만들어봐!',
  hint: `analogWrite(${pin}, 0~255) — 숫자가 클수록 밝아요. 128쯤 넣어볼까요?`,
  base: setup(pin) + `void loop() {\n  analogWrite(${pin}, 128);   // 밝기(0~255)\n}\n`,
});

export const ROOMS = [
  {
    id: 'entry', name: '현관', pin: 5, concept: '디지털 출력',
    intro: '현관이 깜깜해! 벽 스위치를 찾아 첫 불을 켜자.',
    missions: [mOn(5), mBlink(5)],
  },
  {
    id: 'living', name: '거실', pin: 9, concept: '밝기(PWM)',
    intro: '거실은 분위기가 중요해. 켜고, 밝기까지 조절해보자.',
    missions: [mOn(9), mPwm(9)],
  },
  {
    id: 'kitchen', name: '주방', pin: 10, concept: '깜빡임',
    intro: '요리 중 알림등! 켜고, 깜빡이는 신호도 만들어보자.',
    missions: [mOn(10), mBlink(10)],
  },
  {
    id: 'bath', name: '욕실', pin: 11, concept: '은은한 빛(PWM)',
    intro: '욕실엔 눈부시지 않은 은은한 빛이 좋아.',
    missions: [mPwm(11)],
  },
];

export const LOCKED_ROOMS = [
  { id: 'bedroom', name: '침실', note: '온도 센서(DHT11) · 곧 열림' },
];

export const TOTAL_ROOMS = ROOMS.length + LOCKED_ROOMS.length; // 5
export const getRoom = (id) => ROOMS.find((r) => r.id === id);
