// curriculum.js — Eduino AI : 미니게임천국 커리큘럼 단일 공급원(4무대 · 22 미니게임).
// 학습 라벨(기초/응용 등)을 메인으로, '미니게임천국' 서사(무대 퍼포먼스)를 스토리 레이어로 얹는다.
// 스토리: EDDIE가 4개 무대를 돌며 미니게임을 성공시켜 메달·티켓·별을 모으고,
//         모두 모으면 👑 '천국의 왕관' = 학습 100% 완료(졸업).
// 진척은 progress(localStorage)를 읽어 무대/전체 집계를 계산한다.

import { progress } from '../app/progress.js';

// scene: 셸이 실제로 띄울 씬 키 ('setup'|'house'|'dht11'|'relay'|'game'|null=준비중)
// status: 'ready'(구현됨) | 'soon'(준비중) — 준비중은 입장 시 안내만
// concept=학습 개념 / mission=미니게임 한 줄 / reward=모으는 보상(메달·티켓·별)
const R = (id, chapter, name, icon, concept, mission, reward, scene = null) =>
  ({ id, chapter, name, icon, concept, mission, reward, scene, status: scene ? 'ready' : 'soon' });

export const ROOMS = {
  // (사전 준비) 보드 연결 — 광장 입장 전 온보딩. 어느 무대에도 속하지 않음.
  setup: R('setup', null, '보드 연결', '🔌', '사용환경 준비', '천국 입장 준비 — 보드 연결하고 첫 신호 켜기', '🎟️ 입장 티켓', 'setup'),

  // 🎪 시작의 천막 (피지컬 코딩 기초)
  basics: R('basics', 'ch1', '피지컬 코딩 기초', '📘', '피지컬 컴퓨팅 개념', '기초 이론 + 퀴즈 + 분류 미션', '🎓 기초 수료증', 'basics'),

  // 🏛️ 기초의 전당 (센서 첫 무대 · 기초)
  led:   R('led', 'ch2', '반짝반짝 라이트쇼', '💡', '디지털 출력 · PWM', '무대 조명 켜기 — 박자에 맞춰 LED ON!', '💡 조명 메달', 'led'),
  dht11: R('dht11', 'ch2', 'DHT-11 온습도', '🌡️', '센서 입력', '날씨 예보관 — 온습도로 오늘 날씨 맞히기', '🌦️ 날씨 메달', 'dht11'),
  rgb:   R('rgb', 'ch2', 'RGB LED', '🌈', '색 혼합(PWM 3채널)', '무지개 조명 쇼 — 색을 섞어 정답 색 만들기', '🌈 무지개 메달', 'game'),
  buzzer:R('buzzer', 'ch2', '부저', '🔊', 'tone · 주파수', '리듬 연주 한 판 — 음을 맞춰 연주', '🎵 리듬 메달', 'game'),
  seg:   R('seg', 'ch2', '7세그먼트', '🔢', '세그먼트 제어', '카운트다운 쇼 — 숫자를 척척 띄우기', '🔢 숫자 메달', 'game'),
  seg4:  R('seg4', 'ch2', '7세그 4칸', '🕗', '멀티플렉싱', '대형 점수판 쇼 — 네 자리 점수 띄우기', '🕗 점수판 메달'),
  matrix:R('matrix', 'ch2', '8×8 매트릭스', '🟥', '도트 매트릭스', '도트 전광판 쇼 — 그림을 점으로 그리기', '🟥 전광판 메달'),
  step:  R('step', 'ch2', '스텝 모터', '⚙️', '스텝 회전 제어', '회전목마 돌리기 — 정확한 각도로 회전', '⚙️ 회전 메달'),
  relay: R('relay', 'ch2', '릴레이', '🔌', '디지털 출력(스위치)', '대형 스위치 쇼 — 무대 장치 ON/OFF', '🔌 스위치 메달', 'relay'),
  pot:   R('pot', 'ch2', '가변저항', '🎚️', '아날로그 입력', '볼륨 다이얼 게임 — 손잡이로 값 맞히기', '🎚️ 다이얼 메달'),
  cds:   R('cds', 'ch2', '조도 센서', '🔆', '아날로그 입력(빛)', '빛 술래잡기 — 밝기를 감지해 반응', '🔆 햇살 메달'),
  sound: R('sound', 'ch2', '소리 감지', '🎤', '디지털 입력(소리)', '박수 감지 게임 — 짝! 소리에 반응', '🎤 박수 메달'),
  water: R('water', 'ch2', '수위 센서', '💧', '아날로그 입력(물)', '물놀이 워터쇼 — 물 높이를 감지', '💧 물방울 메달'),
  flame: R('flame', 'ch2', '불꽃 감지', '🔥', '디지털 입력(불꽃)', '촛불 끄기 게임 — 불꽃을 찾아라', '🔥 불꽃 메달'),
  keypad:R('keypad', 'ch2', '키패드', '🔢', '매트릭스 입력', '비밀 금고 열기 — 비밀번호를 입력', '🔐 골드 티켓', 'game'),

  // 🎭 응용 대극장 (쇼타임 · 응용)
  remote:   R('remote', 'ch3', '리모컨 컨트롤', '🎛️', '적외선 수신', '원격 조종 쇼 — 리모컨으로 무대 조작', '🎛️ 리모컨 스타'),
  rtc:      R('rtc', 'ch3', '디지털 시계', '⏰', 'RTC · I2C', '시계탑 쇼 — 정확한 시간을 표시', '⏰ 시간 스타'),
  autolight:R('autolight', 'ch3', '자동 조명', '🔆', '센서+출력 조합', '스마트 무대조명 — 어두우면 자동 점등', '💡 자동 스타'),
  firealarm:R('firealarm', 'ch3', '화재 경보기', '🚨', '감지+경보 조합', '안전 지킴이 쇼 — 위험을 감지해 경보', '🚨 지킴이 스타'),
  doorlock: R('doorlock', 'ch3', '스마트 도어락', '🔐', '서보+인증', '비밀의 문 쇼 — 인증하면 문이 열림', '🔐 마스터 스타'),

  // 🕌 마법의 돔 (대망의 피날레)
  final: R('final', 'ch4', '졸업 작품: 나만의 미니게임', '🏆', '통합 프로젝트', '대망의 피날레 무대 — 배운 걸 모아 작품 완성', '👑 천국의 왕관'),
};

export const CHAPTERS = [
  { id: 'ch1', no: 1, label: '시작의 천막', short: '시작의 천막', act: '피지컬 코딩 기초', icon: '🎪',
    rooms: ['basics'] },
  { id: 'ch2', no: 2, label: '기초의 전당', short: '기초의 전당', act: '센서 첫 무대', icon: '🏛️',
    rooms: ['led', 'dht11', 'rgb', 'buzzer', 'seg', 'seg4', 'matrix', 'step', 'relay', 'pot', 'cds', 'sound', 'water', 'flame', 'keypad'] },
  { id: 'ch3', no: 3, label: '응용 대극장', short: '응용 대극장', act: '쇼타임', icon: '🎭',
    rooms: ['remote', 'rtc', 'autolight', 'firealarm', 'doorlock'] },
  { id: 'ch4', no: 4, label: '마법의 돔', short: '마법의 돔', act: '대망의 피날레', icon: '🕌',
    rooms: ['final'] },
];

export const getChapter = (id) => CHAPTERS.find((c) => c.id === id);
export const getRoom = (id) => ROOMS[id] || null;
export const chapterRooms = (id) => (getChapter(id)?.rooms || []).map((rid) => ROOMS[rid]);

export const isRoomCleared = (id) => progress.isCleared(id);
export const chapterClearedCount = (id) => (getChapter(id)?.rooms || []).filter((rid) => progress.isCleared(rid)).length;
export const chapterTotal = (id) => getChapter(id)?.rooms.length || 0;
export const chapterDone = (id) => chapterTotal(id) > 0 && chapterClearedCount(id) === chapterTotal(id);

// 잠금 규칙: 첫 무대는 항상 개방, 이후 무대는 직전 무대를 모두 클리어해야 개방.
export function chapterUnlocked(id) {
  const idx = CHAPTERS.findIndex((c) => c.id === id);
  if (idx <= 0) return true;
  return chapterDone(CHAPTERS[idx - 1].id);
}

export const allRoomIds = () => CHAPTERS.flatMap((c) => c.rooms);
export const overallTotal = () => allRoomIds().length;                 // 22
export const overallCleared = () => allRoomIds().filter((id) => progress.isCleared(id)).length;
export const overallPercent = () => Math.round((overallCleared() / overallTotal()) * 100);
export const allDone = () => overallCleared() >= overallTotal();
