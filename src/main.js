// main.js — Eduino AI · PlayHouse
// 씬 매니저:
//   인트로(Eduino AI → PlayHouse → 스토리)
//   → 사용환경 준비(보드 연결 · 체크리스트 · 내장 LED 테스트)
//   → 앞마당(탑다운 이동 → 현관문)
//   → 집 내부(현관 미션: 버튼/코드로 불 켜기).
// 보드 제어는 src/app/board.js 싱글턴을 모든 씬이 공유한다.

import { showIntro } from './scenes/intro.js';
import { showSetup } from './scenes/setup.js';
import { showYard } from './scenes/yard.js';
import { showHouse } from './scenes/house.js';

const app = () => document.getElementById('app');

function sceneIntro() { showIntro(app(), { onDone: sceneSetup }); }
function sceneSetup() { showSetup(app(), { onDone: sceneYard }); }
function sceneYard()  { showYard(app(),  { onDone: sceneHouse }); }
function sceneHouse() { showHouse(app(), { onBack: sceneSetup }); }

window.addEventListener('DOMContentLoaded', sceneIntro);
