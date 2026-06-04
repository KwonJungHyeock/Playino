// main.js — Eduino AI : 스타터 키트(종합편)
// 씬: 인트로 → 사용환경 준비 → 연구소 복도(학습방 선택)
//      → [LED 문] 결선 안내 → LED 학습방(집) ⇄ 복도.

import { showIntro } from './scenes/intro.js';
import { showSetup } from './scenes/setup.js';
import { showLab } from './scenes/lab.js';
import { showHouse } from './scenes/house.js';

const app = () => document.getElementById('app');

function sceneIntro() { showIntro(app(), { onDone: sceneSetup }); }
function sceneSetup() { showSetup(app(), { onDone: sceneLab }); }
function sceneLab() { showLab(app(), { onEnterLed: sceneHouse }); }
function sceneHouse() { showHouse(app(), { onExit: sceneLab }); }

window.addEventListener('DOMContentLoaded', sceneIntro);
