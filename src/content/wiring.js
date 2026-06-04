// wiring.js — 결선 안내 데이터 (LED 학습방 기준)
// 브레드보드 + 점퍼선. LED 4개: D5/D9/D10/D11, 각 220Ω, 공통 GND.

export const LED_WIRING = {
  title: 'LED 결선 안내',
  subtitle: '브레드보드에 LED 4개를 점퍼선으로 연결해요',
  rows: [
    { color: '#ff5a5a', name: '빨강 LED', pin: 'D5',  res: '220Ω', note: '긴 다리(+,애노드) → D5' },
    { color: '#3ddc91', name: '초록 LED', pin: 'D9',  res: '220Ω', note: '긴 다리(+) → D9' },
    { color: '#6fb7ff', name: '파랑 LED', pin: 'D10', res: '220Ω', note: '긴 다리(+) → D10' },
    { color: '#e8eef9', name: '흰색 LED', pin: 'D11', res: '220Ω', note: '긴 다리(+) → D11' },
  ],
  ground: '각 LED의 짧은 다리(-,캐소드)는 220Ω 저항을 거쳐 Arduino GND 로.',
  safety: [
    '⚠️ VCC(5V)와 GND를 절대 바꾸지 마세요 — 합선/발열·부품 손상 위험!',
    '⚠️ LED 극성 주의: 긴 다리(+)는 핀, 짧은 다리(-)는 GND 쪽.',
    '⚠️ 저항(220Ω) 없이 LED를 직접 연결하면 LED가 탈 수 있어요.',
    '✅ 결선은 USB를 빼고(전원 OFF) 한 뒤, 다시 연결하세요.',
  ],
};
