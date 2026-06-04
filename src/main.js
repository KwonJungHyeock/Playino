// main.js — Eduino AI : 스타터 키트(종합편)
// 씬: 인트로 → 사용환경 준비 → 연구소 복도(학습방 선택)
//      → [LED 문] 결선 안내 → LED 학습방(집) ⇄ 복도.

import { showSplash } from './scenes/splash.js';
import { showIntro } from './scenes/intro.js';
import { showSetup } from './scenes/setup.js';
import { showLab } from './scenes/lab.js';
import { showHouse } from './scenes/house.js';
import { showDht11 } from './scenes/dht11.js';

const app = () => document.getElementById('app');

function sceneSplash() { showSplash(app(), { onDone: sceneIntro }); }
function sceneIntro() { showIntro(app(), { onDone: sceneSetup }); }
function sceneSetup() { showSetup(app(), { onDone: sceneLab }); }
function sceneLab() { showLab(app(), { onEnter: enterRoom }); }   // 연구소 복도 = 맵 허브(L0)

function enterRoom(id) {
  if (id === 'led') sceneHouse();
  else if (id === 'dht11') sceneDht11();
  else sceneLab();
}
function sceneHouse() { showHouse(app(), { onExit: sceneLab }); }
function sceneDht11() { showDht11(app(), { onExit: sceneLab }); }

window.addEventListener('DOMContentLoaded', sceneSplash);
