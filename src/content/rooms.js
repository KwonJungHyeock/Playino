// rooms.js — PlayHouse 방 & 미션 정의 (콘텐츠)
// 실물 배선(docs/HARDWARE.md): 현관=D5 단색 LED. 나머지는 추후 잠금 해제.
//
// 각 방: { id, name, pin, device, missions:[ {id,title,goal,story,concept,base,hint} ] }
//   goal: 'on'(불 켜기) | 'off'(불 끄기) | 'blink'(깜빡이기)

export const ENTRY_ROOM = {
  id: 'entry',
  name: '현관',
  pin: 5,
  device: 'led',
  intro: '현관이 깜깜해! EDDIE가 길을 못 찾고 있어. 불을 켜줄래?',
  missions: [
    {
      id: 'on',
      title: '현관 불 켜기',
      goal: 'on',
      concept: 'digitalWrite',
      story: '벽 스위치를 찾았어! 핀에 전기를 보내면 불이 켜져.',
      hint: 'digitalWrite(5, HIGH) 는 5번 핀에 전기를 보내 불을 켭니다.',
      base:
        'void setup() {\n' +
        '  pinMode(5, OUTPUT);\n' +
        '}\n\n' +
        'void loop() {\n' +
        '  digitalWrite(5, HIGH);   // 불 켜기\n' +
        '}\n',
    },
    {
      id: 'blink',
      title: '불 깜빡여 신호 보내기',
      goal: 'blink',
      concept: 'delay',
      story: '좋아! 이번엔 불을 깜빡여서 "나 여기 있어!" 신호를 보내자.',
      hint: 'HIGH → delay → LOW → delay 를 반복하면 깜빡여요. delay 의 숫자(ms)를 바꿔보세요!',
      base:
        'void setup() {\n' +
        '  pinMode(5, OUTPUT);\n' +
        '}\n\n' +
        'void loop() {\n' +
        '  digitalWrite(5, HIGH);\n' +
        '  delay(500);\n' +
        '  digitalWrite(5, LOW);\n' +
        '  delay(500);\n' +
        '}\n',
    },
  ],
};

// 맵에 보이지만 아직 잠긴 방들 (다음 단계에서 구현)
export const LOCKED_ROOMS = [
  { id: 'living',  name: '거실',  pin: 6,  device: 'neopixel', note: '무드등 (NeoPixel)' },
  { id: 'kitchen', name: '주방',  pin: 9,  device: 'led',      note: '조명 패턴' },
  { id: 'bath',    name: '욕실',  pin: 10, device: 'led',      note: 'PWM 밝기' },
  { id: 'bedroom', name: '침실',  pin: 11, device: 'led',      note: '온도 센서(DHT11)' },
];

export const TOTAL_ROOMS = 1 + LOCKED_ROOMS.length; // 5
