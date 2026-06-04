// main.js — Eduino AI : 스타터 키트(종합편)
// 씬: 인트로 → 사용환경 준비 → 연구소 복도(학습방 선택)
//      → [LED 문] 결선 안내 → LED 학습방(집) ⇄ 복도.

import { showSplash } from './scenes/splash.js';
import { showIntro } from './scenes/intro.js';
import { showSetup } from './scenes/setup.js';
import { showLab } from './scenes/lab.js';
import { showHouse } from './scenes/house.js';
import { showDhtCoding } from './scenes/dhtCoding.js';
import { showDht11Room } from './scenes/dht11room.js';
import { showDht11 } from './scenes/dht11.js';

const app = () => document.getElementById('app');

function sceneSplash() { showSplash(app(), { onDone: sceneIntro }); }
function sceneIntro() { showIntro(app(), { onDone: sceneSetup }); }
function sceneSetup() { showSetup(app(), { onDone: sceneLab }); }
function sceneLab() { showLab(app(), { onEnter: enterRoom }); }   // 연구소 복도 = 맵 허브(L0)

function enterRoom(id) {
  if (id === 'led') sceneHouse();
  else if (id === 'dht11') dhtCoding();      // 코딩 → 모니터링 → 게임
  else sceneLab();
}
function sceneHouse() { showHouse(app(), { onExit: sceneLab }); }

// DHT-11: 코딩 → 모니터링 방 → 미니게임
function dhtCoding() { showDhtCoding(app(), { onDone: dhtRoom, onExit: sceneLab }); }
function dhtRoom() { showDht11Room(app(), { onPlay: dhtGame, onExit: sceneLab }); }
function dhtGame() { showDht11(app(), { onQuit: dhtRoom }); }

window.addEventListener('DOMContentLoaded', sceneSplash);
