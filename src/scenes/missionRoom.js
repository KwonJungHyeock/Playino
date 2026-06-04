// missionRoom.js — 탈출 미니게임을 담는 공용 셸(셸 ↔ 게임 데이터 계약: mountGame(root, ctx)).
// 어두운 탈출 분위기 배경 + 상단바 + 게임 스테이지. 클리어 시 공통 폭죽 마무리 → 복도(챕터)로.
import { getRoom } from '../content/curriculum.js';
import { progress } from '../app/progress.js';
import { board } from '../app/board.js';
import { celebrateRoom } from './celebrate.js';
import { GAMES } from '../games/index.js';

export function showMissionRoom(root, { roomId, onExit } = {}) {
  const m = getRoom(roomId);
  const mount = GAMES[roomId];
  root.innerHTML = `
    <div class="scene game-scene scene-fade escape-room">
      <div class="er-vignette"></div>
      <div class="mr-top">
        <div class="mr-id"><b>${m.icon} ${m.name}</b><span class="mr-esc">${m.escape}</span></div>
        <button class="btn btn-sm" id="mr-exit">🚪 복도로</button>
      </div>
      <div class="mr-stage" id="mr-stage"></div>
      <div class="hud-toast" id="hud-toast"></div>
      <div class="hud-narrate" id="hud-narrate"></div>
    </div>`;

  const stage = root.querySelector('#mr-stage');
  const toastEl = root.querySelector('#hud-toast');
  const narrateEl = root.querySelector('#hud-narrate');
  let tT = null, nT = null, game = null, done = false;

  const back = () => { try { game?.destroy?.(); } catch (_) {} onExit?.(); };
  root.querySelector('#mr-exit').onclick = back;

  const ctx = {
    mission: m, board, progress,
    say: (t) => narrate(t),
    onProgress: () => {},
    onFail: (reason) => { if (reason) toast(reason); },
    onComplete: () => {
      if (done) return; done = true;
      progress.mark(roomId);
      setTimeout(() => celebrateRoom({
        title: '봉인 해제!',
        message: `${m.escape} 성공 — <b>${m.reward}</b> 획득!<br/>시스템이 한 칸 복구됐어요.`,
        exitLabel: '복도로 ▶',
        onExit: back,
      }), 450);
    },
    onExit: back,
  };

  if (!mount) { stage.innerHTML = `<div class="mr-soon">준비중인 방이에요.</div>`; return; }
  game = mount(stage, ctx);

  function toast(t) { toastEl.textContent = t; toastEl.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => toastEl.classList.remove('show'), 2200); }
  function narrate(t) { narrateEl.innerHTML = `<span>🤖 ${t}</span>`; narrateEl.classList.add('show'); clearTimeout(nT); nT = setTimeout(() => narrateEl.classList.remove('show'), 4200); }
}
