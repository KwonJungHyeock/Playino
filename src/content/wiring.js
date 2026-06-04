// wiring.js — 결선 안내 데이터 (학습방별)
// image: 있으면 public/wiring/<id>.png 사진을 그대로 회로도로 사용(없으면 표/SVG 대체).

export const WIRING = {
  led: {
    id: 'led',
    title: 'LED 결선 안내',
    subtitle: '브레드보드에 LED 4개를 점퍼선으로 연결해요',
    image: '/wiring/led.png',
    rows: [
      { color: '#ff5a5a', name: '빨강 LED', pin: 'D5', res: '220Ω', note: '긴 다리(+) → D5' },
      { color: '#3ddc91', name: '초록 LED', pin: 'D9', res: '220Ω', note: '긴 다리(+) → D9' },
      { color: '#6fb7ff', name: '파랑 LED', pin: 'D10', res: '220Ω', note: '긴 다리(+) → D10' },
      { color: '#e8eef9', name: '흰색 LED', pin: 'D11', res: '220Ω', note: '긴 다리(+) → D11' },
    ],
    ground: '각 LED의 짧은 다리(-)는 220Ω 저항을 거쳐 Arduino GND 로.',
    safety: [
      '⚠️ VCC(5V)와 GND를 절대 바꾸지 마세요 — 합선/발열 위험!',
      '⚠️ LED 극성: 긴 다리(+)는 핀, 짧은 다리(-)는 GND 쪽.',
      '⚠️ 저항(220Ω) 없이 LED 직결 금지 — LED가 탑니다.',
      '✅ 결선은 USB(전원)를 빼고 한 뒤 다시 연결하세요.',
    ],
  },
  dht11: {
    id: 'dht11',
    title: 'DHT-11 온습도 센서 결선',
    subtitle: '온습도 센서 모듈을 점퍼선 3개로 연결해요',
    image: '/wiring/dht11.png',
    rows: [
      { color: '#ff5a5a', name: 'VCC (+)', pin: '5V', note: '센서 + 단자 → Arduino 5V' },
      { color: '#444b5e', name: 'GND (-)', pin: 'GND', note: '센서 - 단자 → Arduino GND' },
      { color: '#ffd11a', name: 'DATA (S)', pin: 'D2', note: '신호(S/DATA) → Arduino D2' },
    ],
    ground: '모듈 핀 표기(보통 S · + · -)를 꼭 확인하세요. 제품마다 순서가 달라요!',
    safety: [
      '⚠️ VCC(+)와 GND(-)를 바꾸면 센서가 손상/발열될 수 있어요!',
      '⚠️ DATA 핀은 반드시 D2 에 — 코드가 D2 를 읽습니다.',
      '✅ 모듈에 인쇄된 S/＋/－ 표시를 보고 연결하세요.',
      '✅ 결선은 USB를 빼고 한 뒤 다시 연결하세요.',
    ],
  },
};

WIRING.relay = {
  id: 'relay',
  title: '릴레이 모듈 결선',
  subtitle: '릴레이로 큰 장치(환풍기)를 켜고 꺼요. 점퍼선 3개.',
  image: '/wiring/relay.png',
  rows: [
    { color: '#ff5a5a', name: 'VCC (+)', pin: '5V', note: '릴레이 VCC → Arduino 5V' },
    { color: '#444b5e', name: 'GND (-)', pin: 'GND', note: '릴레이 GND → Arduino GND' },
    { color: '#ffd11a', name: 'IN (신호)', pin: 'D7', note: '릴레이 IN → Arduino D7' },
  ],
  ground: '릴레이 IN 에 HIGH/LOW 를 주면 장치가 ON/OFF 돼요(모듈에 따라 반대일 수 있음).',
  safety: [
    '⚠️ VCC와 GND를 바꾸지 마세요 — 모듈 손상 위험!',
    '⚠️ 가정용 220V 같은 고전압은 절대 연결하지 마세요(저전압 학습만).',
    '✅ IN 핀은 D7 에 — 코드가 D7 을 제어합니다.',
    '✅ 결선은 USB를 빼고 한 뒤 다시 연결하세요.',
  ],
};

export const LED_WIRING = WIRING.led; // 호환
