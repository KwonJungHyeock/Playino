// main.js — Eduino AI · PlayHouse
// 씬 매니저: 인트로 → 사용환경 준비 → 앞마당 ⇄ 집 안.
// 앞마당↔집 안은 현관문/나가기로 오갈 수 있다(스토리 연속).

import { showIntro } from './scenes/intro.js';
import { showSetup } from './scenes/setup.js';
import { showYard } from './scenes/yard.js';
import { showHouse } from './scenes/house.js';

const app = () => document.getElementById('app');

function sceneIntro() { showIntro(app(), { onDone: sceneSetup }); }
function sceneSetup() { showSetup(app(), { onDone: () => sceneYard() }); }
function sceneYard(opts = {}) { showYard(app(), { onDone: sceneHouse, spawn: opts.spawn }); }
function sceneHouse() { showHouse(app(), { onExit: () => sceneYard({ spawn: { x: 436, y: 380 } }) }); }

window.addEventListener('DOMContentLoaded', sceneIntro);
