// main.js — Playino : Escape Room
// 플로우: 스플래시 → 인트로 → 로그인 → 사용환경 준비(CH1) → 연구소 복도(HUB)
//   → 챕터 입구 → 미션 방(LED·DHT11·릴레이 …) → 복귀.

import { showSplash } from './scenes/splash.js';
import { showIntro } from './scenes/intro.js';
import { showLogin } from './scenes/login.js';
import { showSetup } from './scenes/setup.js';
import { showHub } from './scenes/hub.js';
import { showChapter } from './scenes/chapter.js';
import { showHouse } from './scenes/house.js';
import { showDhtCoding } from './scenes/dhtCoding.js';
import { showDht11Room } from './scenes/dht11room.js';
import { showDht11 } from './scenes/dht11.js';
import { showRelay } from './scenes/relay.js';
import { showEscapeRoom } from './scenes/escapeRoom.js';
import { progress } from './app/progress.js';
import { getRoom } from './content/curriculum.js';

const app = () => document.getElementById('app');

let lastChapter = null;   // HUB 복귀 시 들어갔던 게이트 앞
let lastRoom = null;      // 챕터 복귀 시 나온 방 앞

function sceneSplash() { showSplash(app(), { onDone: sceneIntro }); }
function sceneIntro() { showIntro(app(), { onDone: sceneLogin }); }
function sceneLogin() { showLogin(app(), { onDone: sceneSetup }); }
function sceneSetup() {
  showSetup(app(), { onDone: () => { progress.mark('setup'); sceneHub(); } });   // CH1 클리어
}

function sceneHub() { showHub(app(), { onEnter: enterChapter, spawnAt: lastChapter }); }

function enterChapter(chId) {
  lastChapter = chId;
  showChapter(app(), { chapter: chId, onRoom: enterRoom, onExit: sceneHub, onChapter: enterChapter, spawnAt: lastRoom });
}

function backToChapter(roomId) {
  const ch = getRoom(roomId)?.chapter || lastChapter;
  lastRoom = roomId; lastChapter = ch;
  showChapter(app(), { chapter: ch, onRoom: enterRoom, onExit: sceneHub, onChapter: enterChapter, spawnAt: roomId });
}

function enterRoom(roomId) {
  lastRoom = roomId;
  const back = () => backToChapter(roomId);
  switch (roomId) {
    case 'led': showHouse(app(), { onExit: back }); break;
    case 'dht11': dhtCoding(back); break;
    case 'relay': showRelay(app(), { onExit: back }); break;
    case 'setup': showSetup(app(), { onDone: () => { progress.mark('setup'); back(); } }); break;
    default:
      // 탈출 미니게임 방(rgb·buzzer·keypad·seg …)은 탑다운 환경 → 장치 작동 → 미션
      if (getRoom(roomId)?.scene === 'game') showEscapeRoom(app(), { roomId, onExit: back });
      else back();   // 준비중 방은 챕터에서 막으므로 안전망
  }
}

// DHT-11: 코딩 → 모니터링 방 → 미니게임 (모두 onExit 은 챕터로 복귀)
function dhtCoding(back) { showDhtCoding(app(), { onDone: () => dhtRoom(back), onExit: back }); }
function dhtRoom(back) { showDht11Room(app(), { onPlay: () => dhtGame(back), onExit: back, onCode: () => dhtCoding(back) }); }
function dhtGame(back) { showDht11(app(), { onQuit: () => dhtRoom(back) }); }

window.addEventListener('DOMContentLoaded', sceneSplash);
