// main.js — Eduino AI · PlayHouse
// 씬 매니저: 인트로(Eduino AI -> PlayHouse -> 스토리)
//   -> 사용환경 준비(보드 연결 · 체크리스트 · 내장 LED 테스트)
//   -> 거실 레슨(D5 불 켜기).
// 보드 제어는 src/app/board.js 싱글턴을 모든 씬이 공유한다.

import { showIntro } from './scenes/intro.js';
import { showSetup } from './scenes/setup.js';
import { showLesson } from './scenes/lesson.js';

const app = () => document.getElementById('app');

function sceneIntro()  { showIntro(app(),  { onDone: sceneSetup }); }
function sceneSetup()  { showSetup(app(),  { onDone: sceneLesson }); }
function sceneLesson() { showLesson(app(), { onBack: sceneSetup }); }

window.addEventListener('DOMContentLoaded', sceneIntro);
