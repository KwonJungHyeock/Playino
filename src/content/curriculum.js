// curriculum.js — Playino : Escape Room 커리큘럼 단일 공급원(4챕터 · 22방).
// 학습 라벨(기초/응용 등)을 메인으로, 탈출 서사(act/escape)를 스토리 레이어로 얹는다.
// 진척은 progress(localStorage)를 읽어 챕터/전체 집계를 계산한다.

import { progress } from '../app/progress.js';

// scene: 셸이 실제로 띄울 씬 키 ('setup'|'house'|'dht11'|'relay'|null=준비중)
// status: 'ready'(구현됨) | 'soon'(준비중) — 준비중은 입장 시 안내만
const R = (id, chapter, name, icon, concept, escape, reward, scene = null) =>
  ({ id, chapter, name, icon, concept, escape, reward, scene, status: scene ? 'ready' : 'soon' });

export const ROOMS = {
  // CH1 · 각성
  setup: R('setup', 'ch1', '보드 준비', '🔌', '사용환경 준비', '어둠 속 각성', '첫 불빛 · 생존 신호', 'setup'),
  // CH2 · 시스템 복구 (기초)
  led:   R('led', 'ch2', 'LED', '💡', '디지털 출력 · PWM', '암흑 속 첫 불빛', '시야 확보', 'house'),
  dht11: R('dht11', 'ch2', 'DHT-11 온습도', '🌡️', '센서 입력', '생명 유지 진단', '환경 안전 확인', 'dht11'),
  rgb:   R('rgb', 'ch2', 'RGB LED', '🌈', '색 혼합(PWM 3채널)', '색 암호등', '색 코드 조각', 'game'),
  buzzer:R('buzzer', 'ch2', '부저', '🔊', 'tone · 주파수', '경보 해제', '정적 회복', 'game'),
  seg:   R('seg', 'ch2', '7세그먼트', '🔢', '세그먼트 제어', '봉인 카운트다운', '출구 일부 개방', 'game'),
  seg4:  R('seg4', 'ch2', '7세그 4칸', '🕗', '멀티플렉싱', '금고 코드', '금고 속 열쇠'),
  matrix:R('matrix', 'ch2', '8×8 매트릭스', '🟥', '도트 매트릭스', '벽의 신호', '숨은 통로 점등'),
  step:  R('step', 'ch2', '스텝 모터', '⚙️', '스텝 회전 제어', '기어 잠금', '봉인문 개방'),
  relay: R('relay', 'ch2', '릴레이', '🔌', '디지털 출력(스위치)', '차단기 복구', '구역 전력 복구', 'relay'),
  pot:   R('pot', 'ch2', '가변저항', '🎚️', '아날로그 입력', '주파수 다이얼', '단서 수신'),
  cds:   R('cds', 'ch2', '조도 센서', '🔆', '아날로그 입력(빛)', '빛 봉인', '봉인 통과'),
  sound: R('sound', 'ch2', '소리 감지', '🎤', '디지털 입력(소리)', '정적의 방', '함정 통과'),
  water: R('water', 'ch2', '수위 센서', '💧', '아날로그 입력(물)', '침수 탈출', '배수 성공'),
  flame: R('flame', 'ch2', '불꽃 감지', '🔥', '디지털 입력(불꽃)', '화재 구역', '경로 확보'),
  keypad:R('keypad', 'ch2', '키패드', '🔢', '매트릭스 입력', '출입문 비번', '출입문 해제', 'game'),
  // CH3 · 보안 돌파 (응용)
  remote:   R('remote', 'ch3', '리모컨 컨트롤', '🎛️', '적외선 수신', '원격 제어실', '원격 통로 개방'),
  rtc:      R('rtc', 'ch3', '디지털 시계', '⏰', 'RTC · I2C', '시간 봉인문', '시간문 개방'),
  autolight:R('autolight', 'ch3', '자동 조명', '🔆', '센서+출력 조합', '어둠의 복도', '복도 점등'),
  firealarm:R('firealarm', 'ch3', '화재 경보기', '🚨', '감지+경보 조합', '화재 차단', '출구 정리'),
  doorlock: R('doorlock', 'ch3', '스마트 도어락', '🔐', '서보+인증', '최종 보안문 앞', '최종문 접근'),
  // CH4 · 최종 탈출
  final: R('final', 'ch4', '메인 시스템 복구 & 탈출', '🚪', '통합 프로젝트', '최종 탈출', '엔딩'),
};

export const CHAPTERS = [
  { id: 'ch1', no: 1, label: 'CH1 사용환경 준비', short: '사용환경 준비', act: '각성', icon: '⚡',
    rooms: ['setup'] },
  { id: 'ch2', no: 2, label: 'CH2 기초 학습', short: '기초 학습', act: '시스템 복구', icon: '🔧',
    rooms: ['led', 'dht11', 'rgb', 'buzzer', 'seg', 'seg4', 'matrix', 'step', 'relay', 'pot', 'cds', 'sound', 'water', 'flame', 'keypad'] },
  { id: 'ch3', no: 3, label: 'CH3 응용 학습', short: '응용 학습', act: '보안 돌파', icon: '🛡️',
    rooms: ['remote', 'rtc', 'autolight', 'firealarm', 'doorlock'] },
  { id: 'ch4', no: 4, label: 'CH4 최종 프로젝트', short: '최종 프로젝트', act: '최종 탈출', icon: '🚪',
    rooms: ['final'] },
];

export const getChapter = (id) => CHAPTERS.find((c) => c.id === id);
export const getRoom = (id) => ROOMS[id] || null;
export const chapterRooms = (id) => (getChapter(id)?.rooms || []).map((rid) => ROOMS[rid]);

export const isRoomCleared = (id) => progress.isCleared(id);
export const chapterClearedCount = (id) => (getChapter(id)?.rooms || []).filter((rid) => progress.isCleared(rid)).length;
export const chapterTotal = (id) => getChapter(id)?.rooms.length || 0;
export const chapterDone = (id) => chapterTotal(id) > 0 && chapterClearedCount(id) === chapterTotal(id);

// 잠금 규칙: CH1은 항상 개방, 이후 챕터는 직전 챕터를 모두 클리어해야 개방.
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
