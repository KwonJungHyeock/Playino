// sensorRoom.js — 박물관형 센서 전시관(탑다운). EDDIE가 걸어다니며
//   📖 이론관(자료 가로슬라이드 + 13번 핀 블록코딩 체험) / 🎮 체험관(미니게임) 입구로 입장.
//   밝은 카니발/박물관 톤. config 기반 확장형.
import { createWorld } from '../engine/topdown.js';
import { sfx } from '../app/sfx.js';
import { progress } from '../app/progress.js';
import { board } from '../app/board.js';
import { mountEddieRig } from '../app/eddieRig.js';
import { showLedGame } from './ledGame.js';
import { showBuzzerGame } from './buzzerGame.js';

const roomCache = {};
function roomImgFor(name) { const key = name || 'room-bg'; if (!roomCache[key]) { const im = new Image(); im.src = `/brand/${key}.webp`; roomCache[key] = im; } return roomCache[key]; }

const ROOMS_CFG = {
  led: {
    name: '반짝반짝 라이트쇼', sensor: 'LED · 발광 다이오드', icon: '💡', accent: '255,200,74',
    room: 'room-bg', eddie: null, signL: '120,225,255', signR: '255,158,90', control: 'led', blockPin: 13,
    intro: '이론관에서 LED를 배우고, 체험관에서 직접 연주해보자! 🎶',
    animTheory: 'led',
    captions: [
      '전자(−)와 정공(+)이 ‘딱’ 만나면 빛이 짠! 하고 나와요 ✨',
      '디지털 출력 — 1(HIGH)이면 켜짐, 0(LOW)이면 꺼짐! 🔆',
      '색마다 빛 에너지(파장)가 달라요 — 초록·노랑·빨강! 🌈',
    ],
    play: (root, opt) => showLedGame(root, opt),
  },
  buzzer: {
    name: '멜로디 연주단', sensor: '수동 부저 · Passive Buzzer', icon: '🔊', accent: '150,210,120',
    room: 'room-buzzer-bg', eddie: '/brand/eddie-buzzer.webp', signL: '140,210,150', signR: '255,200,110', control: 'keys', blockPin: 5,
    intro: '이론관에서 부저를 배우고, 체험관에서 멜로디를 연주하자! 🎶',
    animTheory: 'buzzer',                                 // 정적 이미지 대신 코드 애니메이션 이론
    captions: [
      '전기가 들어오면 얇은 판이 빠르게 떨려요 → 그 떨림이 공기를 흔들어 소리가 나요! 🔊',
      '음 높이 = 주파수(Hz)! 빠르게 떨릴수록(높은 Hz) 높은 음 — 슬라이더로 바꿔 들어봐 🎵',
      '알람·초인종·멜로디… 부저는 소리로 우리에게 알려줘요 🔔',
    ],
    play: (root, opt) => showBuzzerGame(root, opt),
  },
  rgb: {
    name: '무지개 물감놀이', sensor: 'RGB LED · 3색 LED', icon: '🌈', accent: '180,140,255',
    room: 'room-rgb-bg', eddie: null, signL: '120,200,255', signR: '255,150,200', control: 'rgb',
    pins: { r: 9, g: 10, b: 11 }, blockPin: 9,
    intro: '이론관에서 빛의 삼원색을 배우고, 체험관에서 색을 섞어보자! 🌈',
    animTheory: 'rgb',
    captions: [
      '빨강·초록·파랑(RGB) 빛을 겹치면 새 색이 돼요 — 빛은 섞을수록 밝아져요! ✨',
      'PWM으로 각 색의 밝기(0~255)를 조절 → 원하는 색을 자유자재로! 🎚️',
      '폰·TV·무드등 화면이 전부 이 RGB로 모든 색을 만들어요 📺',
    ],
    // 체험관(미니게임)은 다음 단계 — 지금은 '곧 공개' 안내
    play: (root, opt) => soonPlay(root, opt, '무지개 물감놀이', 'stage-rgb-bg'),
  },
};

// 아직 게임 미구현인 체험관 — 무대 배경 위에 '곧 공개' 안내
function soonPlay(root, { onExit } = {}, name, bg) {
  root.innerHTML = `<div class="led scene-fade"><div class="soon-bg" id="soon-bg"></div>
    <div class="soon-card"><div class="soon-emoji">🎵</div><h2>${name} — 곧 공개!</h2>
    <p>이 체험관 미니게임은 준비 중이에요. 이론관에서 먼저 배워볼까요?</p>
    <button class="cel-go" id="soon-back">전시관으로 ▶</button></div></div>`;
  const im = new Image(); im.onload = () => { const e = root.querySelector('#soon-bg'); if (e) { e.style.backgroundImage = `url(${im.src})`; } };
  im.src = `/brand/${bg}.webp`;
  root.querySelector('#soon-back').onclick = () => onExit?.();
}

export function showSensorRoom(root, { id, onExit } = {}) {
  const cfg = ROOMS_CFG[id]; if (!cfg) { onExit?.(); return; }
  const VW = Math.max(900, window.innerWidth), VH = Math.max(440, window.innerHeight);
  const FLOOR_Y = VH * 0.74;                       // EDDIE가 걷는 바닥 라인(좌우 전용)
  // 화살표 푯말 — 각 문을 가리킴(왼쪽=이론관/오른쪽=체험관)
  const stations = [
    { id: 'theory', icon: '📖', label: '이론관', sub: '자료 + 체험', dir: -1, cx: VW * 0.27, signY: VH * 0.50, postY: FLOOR_Y, color: cfg.signL },
    { id: 'play', icon: '🎮', label: '체험관', sub: '미니게임', dir: 1, cx: VW * 0.73, signY: VH * 0.50, postY: FLOOR_Y, color: cfg.signR },
  ];

  root.innerHTML = `
    <div class="scene game-scene scene-fade escape-scene sroom2">
      <div class="world-host" id="world-host"></div>
      <div class="sr-top"><span class="sr-chip">${cfg.icon}</span> <b>${cfg.name}</b> <span class="sr-sensor">· ${cfg.sensor}</span></div>
      <button class="bx-exit" id="sr-exit">✕ 무대로</button>
      <button class="snd-toggle" id="snd-toggle">${sfx.muted ? '🔇' : '🔊'}</button>
      <div class="hud-controls">⬅➡ 좌우 이동 · 문 끝까지 가면 입장 · ✕ 무대로</div>
      <div class="sr-fade" id="sr-fade"></div>
      <div class="sr-theory-view" id="sr-tview" hidden></div>
    </div>`;

  const host = root.querySelector('#world-host');
  const fade = root.querySelector('#sr-fade');
  const snd = root.querySelector('#snd-toggle'); snd.onclick = () => { const m = sfx.toggle(); snd.textContent = m ? '🔇' : '🔊'; };
  root.querySelector('#sr-exit').onclick = () => { sfx.pop(); destroyAll(); onExit?.(); };
  const bubble = document.createElement('div'); bubble.className = 'eddie-bubble'; host.appendChild(bubble);
  let bubbleT = null;
  function guide(t, ms = 4200) { bubble.innerHTML = `🤖 ${t}`; bubble.classList.add('show'); clearTimeout(bubbleT); if (ms) bubbleT = setTimeout(() => bubble.classList.remove('show'), ms); }

  const map = {
    width: VW, height: VH, bg: '#efe2c8', playerScale: 1.75, lockVertical: true, eddieSrc: cfg.eddie,
    spawn: { x: VW / 2 - 14, y: FLOOR_Y - 30 },
    walls: [{ x: 0, y: 0, w: 14, h: VH }, { x: VW - 14, y: 0, w: 14, h: VH }],
    // 문 끝(좌/우 가장자리)에 닿으면 자동 입장(페이드)
    triggers: [
      { id: 'theory', auto: true, x: 0, y: 0, w: VW * 0.13, h: VH },
      { id: 'play', auto: true, x: VW * 0.87, y: 0, w: VW * 0.13, h: VH },
    ],
    draw: (ctx, st) => drawRoom(ctx, st, stations, cfg, VW, VH, roomImgFor(cfg.room)),
  };

  const world = createWorld(host, map, {
    onAuto: enterDoor, onFrame: onFrame,
    onEddieClick: () => guide('왼쪽=이론관 📖 · 오른쪽=체험관 🎮 — 문 끝까지 걸어가!', 2800),
    onDrawOverlay: drawVignette,
  });
  setTimeout(() => guide(cfg.intro), 500);

  function destroyAll() { try { world.destroy(); } catch (_) {} }
  let entering = false;
  function enterDoor(idTrig) {
    if (entering) return; entering = true;
    sfx.start(); world.pause(); fade.classList.add('on');
    setTimeout(() => {
      if (idTrig === 'theory') { openTheory(); fade.classList.remove('on'); entering = false; }
      else { destroyAll(); cfg.play(root, { onExit: () => showSensorRoom(root, { id, onExit }) }); }
    }, 480);
  }
  function onFrame(state) {
    const p = state.player, cam = state.cam;
    bubble.style.left = ((p.x + p.w / 2) - cam.x) + 'px'; bubble.style.top = (p.y - cam.y - 110) + 'px';
  }
  function drawVignette(ctx, st, canvas) {
    const g = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.46, canvas.height * 0.42, canvas.width / 2, canvas.height / 2, canvas.height * 1.02);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,30,10,0.18)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ───────── 이론관 오버레이 (자료 슬라이드 + 블록코딩) ─────────
  function openTheory() {
    world.pause();
    const v = root.querySelector('#sr-tview'); v.hidden = false;
    let tab = 'info', ci = 0, blink = null, ledOn = false, blinkOn = false, stateUnsub = null, theoryRaf = null;
    const INFO = (cfg.info || []).map((n) => `/brand/${n}.webp`), CAPS = cfg.captions || [];

    v.innerHTML = `
      <div class="prep-card tv-card">
        <div class="tv-tabs">
          <button class="tv-tab on" data-t="info">📚 자료</button>
          <button class="tv-tab" data-t="code">${cfg.control === 'keys' ? '🎹 연주판' : cfg.control === 'rgb' ? '🎨 색 섞기' : '🎛️ LED 제어'}</button>
          <button class="tv-x" id="tv-x">✕ 나가기</button>
        </div>
        <div class="tv-body" id="tv-body"></div>
      </div>
      <div class="tv-eddie-wrap" id="tv-ew" hidden>
        <div class="tv-bubble" id="tv-bubble"></div>
        <div class="tv-eddie" id="tv-eddie"></div>
      </div>`;
    const bodyEl = v.querySelector('#tv-body'), ew = v.querySelector('#tv-ew'), bub = v.querySelector('#tv-bubble');
    mountEddieRig(v.querySelector('#tv-eddie'), { hero: cfg.eddie });
    v.querySelectorAll('.tv-tab').forEach((b) => b.onclick = () => { if (tab === b.dataset.t) return; tab = b.dataset.t; if (tab !== 'code') stopBlink(); v.querySelectorAll('.tv-tab').forEach((x) => x.classList.toggle('on', x === b)); renderTab(); });
    v.querySelector('#tv-x').onclick = close;
    function close() {
      stopBlink(); stopRaf(); if (stateUnsub) { stateUnsub(); stateUnsub = null; }
      if (board.connected) {
        if (cfg.control === 'rgb') { const p = cfg.pins; board.pwm(p.r, 0).catch(() => {}); board.pwm(p.g, 0).catch(() => {}); board.pwm(p.b, 0).catch(() => {}); }
        else if (cfg.control !== 'keys') board.digital(cfg.blockPin, false).catch(() => {});
      }
      v.hidden = true; v.innerHTML = ''; world.teleport(VW * 0.5 - 14, FLOOR_Y - 30); world.resume();
    }
    function stopRaf() { if (theoryRaf) { cancelAnimationFrame(theoryRaf); theoryRaf = null; } }
    function renderTab() { stopRaf(); tab === 'info' ? renderInfo() : (cfg.control === 'keys' ? renderKeys() : cfg.control === 'rgb' ? renderRgb() : renderControl()); }

    // 자료 — 코드 애니메이션 이론(부저 등). 정적 이미지 대신 직접 생동감 있게.
    function renderAnim() {
      ew.hidden = false;
      const ANIM = cfg.animTheory === 'led' ? ledTheory() : cfg.animTheory === 'rgb' ? rgbTheory() : buzzerTheory();
      bodyEl.innerHTML = `
        <div class="tv-slider">
          <button class="tv-arrow" id="tv-prev">◀</button>
          <div class="tv-anim" id="tv-anim"></div>
          <button class="tv-arrow" id="tv-next">▶</button>
        </div>
        <div class="tv-dots">${ANIM.map((_, i) => `<i class="${i === ci ? 'on' : ''}" data-i="${i}"></i>`).join('')}</div>`;
      const stage = bodyEl.querySelector('#tv-anim');
      const show = () => {
        stopRaf();
        stage.innerHTML = ANIM[ci].html;
        if (ANIM[ci].init) ANIM[ci].init(stage, (id) => { theoryRaf = id; });
        bodyEl.querySelectorAll('.tv-dots i').forEach((d, i) => d.classList.toggle('on', i === ci));
        const cap = (cfg.captions || [])[ci] || '';
        bub.innerHTML = `🤖 ${cap}`; bub.classList.remove('pop'); void bub.offsetWidth; bub.classList.add('pop');
      };
      show();
      const go = (d) => { sfx.hover(); ci = (ci + d + ANIM.length) % ANIM.length; show(); };
      bodyEl.querySelector('#tv-prev').onclick = () => go(-1);
      bodyEl.querySelector('#tv-next').onclick = () => go(1);
      bodyEl.querySelectorAll('.tv-dots i').forEach((d) => d.onclick = () => { ci = +d.dataset.i; show(); });
    }

    // 화면 어느 탭이든 EDDIE가 설명
    function showEddie(text) { ew.hidden = false; bub.innerHTML = `🤖 ${text}`; bub.classList.remove('pop'); void bub.offsetWidth; bub.classList.add('pop'); }

    // 부저 연주판: 계이름 버튼(음 재생) — 3×3 정사각 패드. 보드 연결 시 실제 부저음(tone)
    function renderKeys() {
      showEddie('계이름 버튼을 눌러 음을 들어봐! 위로 갈수록 높은 음이야 🎵');
      const NOTES = [['도', 262], ['레', 294], ['미', 330], ['파', 349], ['솔', 392], ['라', 440], ['시', 494], ['도↑', 523], ['레↑', 587]];
      bodyEl.innerHTML = `
        <div class="kb">
          <p class="kb-info">🎹 계이름을 눌러 연주! 음이 <b>높을수록 주파수(Hz)</b>가 커져. <span class="kb-pin">🔊 테스트: 부저를 <b>D5</b>에 연결</span></p>
          <div class="kb-keys sq">${NOTES.map((n, i) => `<button class="kb-key" data-i="${i}"><b>${n[0]}</b><span>${n[1]}Hz</span></button>`).join('')}</div>
          <button class="dbtn ghost dc-conn" id="dc-conn">${board.connected ? '🔌 보드 연결됨 ✓' : '🔌 보드 연결(실물 부저)'}</button>
          <div class="dc-status" id="dc-status">${board.connected ? '누르면 실제 부저가 소리나! 🔊' : '연결하면 실제 부저음이 나요. (안 해도 화면 소리로 체험)'}</div>
        </div>`;
      const status = bodyEl.querySelector('#dc-status'), connBtn = bodyEl.querySelector('#dc-conn');
      const play = (b) => {                                  // pointerdown 으로 즉시 반응(지연 최소화)
        const [, freq] = NOTES[+b.dataset.i]; sfx.note(freq, 300);
        if (board.connected) board.tone(cfg.blockPin, freq, 300).catch(() => {});
        b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 150);
      };
      bodyEl.querySelectorAll('.kb-key').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); play(b); }));
      connBtn.onclick = async () => {
        if (board.connected) return; status.textContent = '연결 중… 포트를 골라주세요 🔌';
        try { await board.connect(); connBtn.textContent = '🔌 보드 연결됨 ✓'; status.textContent = '누르면 실제 부저가 소리나! 🔊'; }
        catch (e) { status.textContent = board.classify(e).note; }
      };
      if (stateUnsub) stateUnsub();
      stateUnsub = board.onState(() => { const c = board.connected; connBtn.textContent = c ? '🔌 보드 연결됨 ✓' : '🔌 보드 연결(실물 부저)'; if (!c) status.textContent = '보드 연결이 끊겼어요 — 다시 [보드 연결]을 눌러줘'; });
    }

    // RGB 색 섞기 대시보드: R/G/B 슬라이더(0~255) → 실시간 색 미리보기 + 프리셋. 보드 연결 시 실제 RGB LED(PWM)
    function renderRgb() {
      showEddie('빨강·초록·파랑을 섞어 색을 만들어봐! 다 올리면 하양, 다 내리면 꺼짐 🎨');
      const P = cfg.pins;
      const h2 = (n) => (+n).toString(16).padStart(2, '0').toUpperCase();
      const PRESETS = [['하양', 255, 255, 255], ['빨강', 255, 0, 0], ['초록', 0, 255, 0], ['파랑', 0, 0, 255], ['노랑', 255, 255, 0], ['하늘', 0, 255, 255], ['분홍', 255, 0, 255], ['주황', 255, 110, 0], ['보라', 150, 0, 255]];
      bodyEl.innerHTML = `
        <div class="dash rgb-dash">
          <div class="dash-led">
            <div class="rgb-sw" id="rgb-sw"></div>
            <div class="rgb-read"><b id="rgb-hex">#FFFFFF</b><span id="rgb-rgb">R255 · G255 · B255</span></div>
            <div class="dl-pin">🎨 테스트: <b>R→D9 · G→D10 · B→D11</b><br><span>(공통 캐소드 RGB LED · 각 다리에 220Ω 저항)</span></div>
          </div>
          <div class="dash-cards">
            <div class="dcard">
              <div class="dc-h">🎚️ PWM 색 혼합 <span>각 채널 0~255</span></div>
              <div class="rt-sliders">
                <label class="rs r">R <input type="range" id="cr" min="0" max="255" value="255"><b id="cvr">255</b></label>
                <label class="rs g">G <input type="range" id="cg" min="0" max="255" value="255"><b id="cvg">255</b></label>
                <label class="rs b">B <input type="range" id="cb" min="0" max="255" value="255"><b id="cvb">255</b></label>
              </div>
            </div>
            <div class="dcard">
              <div class="dc-h">🎨 프리셋 색</div>
              <div class="rgb-presets">${PRESETS.map((p, i) => `<button class="rgb-chip" data-i="${i}" style="background:rgb(${p[1]},${p[2]},${p[3]})" title="${p[0]}"></button>`).join('')}</div>
            </div>
            <button class="dbtn ghost dc-conn" id="dc-conn">${board.connected ? '🔌 보드 연결됨 ✓' : '🔌 보드 연결(실물 RGB LED)'}</button>
            <div class="dc-status" id="dc-status">${board.connected ? '슬라이더로 실제 RGB LED 색을 바꿔봐! 🌈' : '연결하면 실제 RGB LED가 같은 색으로 빛나요. (안 해도 화면으로 체험)'}</div>
          </div>
        </div>`;
      const sw = bodyEl.querySelector('#rgb-sw'), hexEl = bodyEl.querySelector('#rgb-hex'), rgbEl = bodyEl.querySelector('#rgb-rgb');
      const cr = bodyEl.querySelector('#cr'), cg = bodyEl.querySelector('#cg'), cb = bodyEl.querySelector('#cb');
      const vr = bodyEl.querySelector('#cvr'), vg = bodyEl.querySelector('#cvg'), vb = bodyEl.querySelector('#cvb');
      const status = bodyEl.querySelector('#dc-status');
      function sendRGB(r, g, b) { if (board.connected) { board.pwm(P.r, r).catch(() => {}); board.pwm(P.g, g).catch(() => {}); board.pwm(P.b, b).catch(() => {}); } }
      function paint(send) {
        const r = +cr.value, g = +cg.value, b = +cb.value;
        sw.style.background = `rgb(${r},${g},${b})`;
        hexEl.textContent = '#' + h2(r) + h2(g) + h2(b);
        rgbEl.textContent = `R${r} · G${g} · B${b}`;
        vr.textContent = r; vg.textContent = g; vb.textContent = b;
        if (send) sendRGB(r, g, b);
      }
      [cr, cg, cb].forEach((s) => s.oninput = () => paint(true));
      bodyEl.querySelectorAll('.rgb-chip').forEach((c) => c.onclick = () => { const p = PRESETS[+c.dataset.i]; cr.value = p[1]; cg.value = p[2]; cb.value = p[3]; sfx.ok(); paint(true); });
      paint(false);
      const connBtn = bodyEl.querySelector('#dc-conn');
      connBtn.onclick = async () => {
        if (board.connected) return; status.textContent = '연결 중… 포트를 골라주세요 🔌';
        try { await board.connect(); connBtn.textContent = '🔌 보드 연결됨 ✓'; status.textContent = '슬라이더로 실제 RGB LED 색을 바꿔봐! 🌈'; paint(true); }
        catch (e) { status.textContent = board.classify(e).note; }
      };
      if (stateUnsub) stateUnsub();
      stateUnsub = board.onState(() => {
        const c = board.connected;
        connBtn.textContent = c ? '🔌 보드 연결됨 ✓' : '🔌 보드 연결(실물 RGB LED)';
        if (!c) status.textContent = '보드 연결이 끊겼어요 — 다시 [보드 연결]을 눌러줘';
      });
    }

    // 자료: 큰 슬라이드 + 흰 박스 밖(여백)의 EDDIE가 설명
    function renderInfo() {
      if (stateUnsub) { stateUnsub(); stateUnsub = null; }
      if (cfg.animTheory) { renderAnim(); return; }
      ew.hidden = false;
      if (!INFO.length) { ew.hidden = true; bodyEl.innerHTML = `<p class="sr-tbody" style="text-align:center;padding:50px">자료 이미지를 준비 중이에요.</p>`; return; }
      bodyEl.innerHTML = `
        <div class="tv-slider">
          <button class="tv-arrow" id="tv-prev">◀</button>
          <div class="tv-stage" id="tv-stage"></div>
          <button class="tv-arrow" id="tv-next">▶</button>
        </div>
        <div class="tv-dots">${INFO.map((_, i) => `<i class="${i === ci ? 'on' : ''}" data-i="${i}"></i>`).join('')}</div>`;
      const stage = bodyEl.querySelector('#tv-stage');
      const show = () => {
        stage.style.backgroundImage = `url(${INFO[ci]})`;
        bodyEl.querySelectorAll('.tv-dots i').forEach((d, i) => d.classList.toggle('on', i === ci));
        bub.innerHTML = `🤖 ${CAPS[ci] || '좌우로 넘겨봐!'}`; bub.classList.remove('pop'); void bub.offsetWidth; bub.classList.add('pop');
      };
      show();
      const go = (d) => { sfx.hover(); ci = (ci + d + INFO.length) % INFO.length; show(); };
      bodyEl.querySelector('#tv-prev').onclick = () => go(-1);
      bodyEl.querySelector('#tv-next').onclick = () => go(1);
      bodyEl.querySelectorAll('.tv-dots i').forEach((d) => d.onclick = () => { ci = +d.dataset.i; show(); });
    }

    // LED 제어 대시보드: 디지털(ON/OFF) + 깜빡임 (D13은 디지털 전용 — 아날로그 없음)
    function renderControl() {
      showEddie('버튼으로 LED를 켜고 꺼봐! 빠르게 깜빡이게도 할 수 있어 💡');
      bodyEl.innerHTML = `
        <div class="dash">
          <div class="dash-led">
            <div class="dl-bulb" id="dl-bulb"><span>LED</span></div>
            <div class="dl-state" id="dl-state">상태 · OFF (LOW)</div>
            <div class="dl-pin">💡 테스트: <b>13번 핀</b>에 LED 연결<br><span>(보드에도 13번 LED 내장 — 결선 없이 바로!)</span></div>
          </div>
          <div class="dash-cards">
            <div class="dcard">
              <div class="dc-h">🔌 디지털 제어 <span>HIGH / LOW</span></div>
              <div class="dc-btns"><button class="dbtn on" id="d-on">켜기 ON</button><button class="dbtn off" id="d-off">끄기 OFF</button></div>
            </div>
            <div class="dcard">
              <div class="dc-h">⏱️ 깜빡임 <span>속도 <b id="b-spd">0.4초</b></span></div>
              <div class="dc-row"><button class="dbtn ghost" id="b-toggle">▶ 깜빡이기</button><input type="range" id="b-range" min="120" max="1000" step="20" value="400"></div>
            </div>
            <button class="dbtn ghost dc-conn" id="dc-conn">${board.connected ? '🔌 보드 연결됨 ✓' : '🔌 보드 연결(실물 LED)'}</button>
            <div class="dc-status" id="dc-status">${board.connected ? '버튼으로 실제 13번 LED를 제어해봐!' : '연결하면 실제 LED도 제어돼요. (안 해도 화면으로 체험)'}</div>
          </div>
        </div>`;
      const bulb = bodyEl.querySelector('#dl-bulb'), stateEl = bodyEl.querySelector('#dl-state');
      const bRange = bodyEl.querySelector('#b-range'), bSpd = bodyEl.querySelector('#b-spd'), bTog = bodyEl.querySelector('#b-toggle');
      const status = bodyEl.querySelector('#dc-status');
      function send(o) { if (board.connected) board.digital(cfg.blockPin, o).catch(() => {}); }
      function paint(o) { bulb.classList.toggle('on', o); stateEl.textContent = o ? '상태 · ON (HIGH)' : '상태 · OFF (LOW)'; }
      const delayLabel = () => bSpd.textContent = (+bRange.value / 1000).toFixed(1) + '초';
      const dOn = bodyEl.querySelector('#d-on'), dOff = bodyEl.querySelector('#d-off');
      function setLed(o, doSend) { ledOn = o; paint(o); dOn.classList.toggle('active', o); dOff.classList.toggle('active', !o); if (doSend) send(o); }
      setLed(ledOn, false); delayLabel();
      dOn.onclick = () => { sfx.ok(); stopBlink(); setLed(true, true); };
      dOff.onclick = () => { sfx.pop(); stopBlink(); setLed(false, true); };
      bRange.oninput = () => { delayLabel(); if (blinkOn) startBlink(); };
      bTog.onclick = () => { if (blinkOn) { sfx.pop(); stopBlink(); paint(ledOn); send(ledOn); } else { sfx.click(); startBlink(); } };
      function startBlink() {
        stopBlink(); blinkOn = true; bTog.textContent = '⏹ 멈추기';
        let o = true; paint(true); send(true);
        blink = setInterval(() => { o = !o; paint(o); send(o); }, +bRange.value);
        status.textContent = '깜빡이는 중! 속도 슬라이더를 바꿔봐 🎚️';
      }
      const connBtn = bodyEl.querySelector('#dc-conn');
      connBtn.onclick = async () => {
        if (board.connected) return; status.textContent = '연결 중… 포트를 골라주세요 🔌';
        try { await board.connect(); connBtn.textContent = '🔌 보드 연결됨 ✓'; status.textContent = '버튼으로 실제 13번 LED를 제어해봐!'; }
        catch (e) { status.textContent = board.classify(e).note; }
      };
      // 보드 상태 실시간 반영(케이블 분리 등) — 통일된 board 상태 구독
      if (stateUnsub) stateUnsub();
      stateUnsub = board.onState(() => {
        const c = board.connected;
        connBtn.textContent = c ? '🔌 보드 연결됨 ✓' : '🔌 보드 연결(실물 LED)';
        if (!c) { stopBlink(); setLed(false, false); status.textContent = '보드 연결이 끊겼어요 — 다시 [보드 연결]을 눌러줘'; }
      });
    }

    function stopBlink() { if (blink) { clearInterval(blink); blink = null; } blinkOn = false; const tg = bodyEl.querySelector('#b-toggle'); if (tg) tg.textContent = '▶ 깜빡이기'; }

    renderTab();
  }
}

// ───────── LED 이론 애니메이션(코드로 직접) ─────────
function ledTheory() {
  return [
    { // ① 원리: 전자(−)+정공(+) 만나 빛
      html: `<div class="ba la1">
        <div class="la-field">
          <div class="la-p e">e⁻<em>전자</em></div>
          <div class="la-center"><div class="la-flash"></div><div class="la-bulb on"></div></div>
          <div class="la-p h">h⁺<em>정공</em></div>
        </div>
        <div class="ba-flow">전자(−)와 정공(+)이 <b>만나면</b> → 빛이 ‘짠!’ 하고 나와요 ✨</div>
      </div>` },
    { // ② 디지털 출력 HIGH/LOW
      html: `<div class="ba la2">
        <div class="la-sig"><span class="la-high">1 · HIGH</span><span class="la-low">0 · LOW</span></div>
        <div class="la-bulb la-blink"></div>
        <div class="ba-flow"><b>디지털 출력</b> — 1(HIGH)이면 켜지고, 0(LOW)이면 꺼져요!</div>
      </div>` },
    { // ③ 색 = 빛 에너지(파장)
      html: `<div class="ba la3">
        <div class="la-bulbs"><span class="la-cb g"></span><span class="la-cb y"></span><span class="la-cb r"></span></div>
        <div class="la-names"><i>초록</i><i>노랑</i><i>빨강</i></div>
        <div class="ba-flow">색마다 <b>빛 에너지(파장)</b>가 달라서 다른 색으로 빛나요! 🌈</div>
      </div>` },
  ];
}

// ───────── RGB 이론 애니메이션(코드로 직접) ─────────
function rgbTheory() {
  return [
    { // ① 빛의 삼원색 — 겹치면 밝아짐(가산혼합)
      html: `<div class="ba rt1">
        <div class="rt-venn"><span class="rc r"></span><span class="rc g"></span><span class="rc b"></span></div>
        <div class="ba-flow">빨강·초록·파랑 <b>빛</b>을 겹치면 → 가운데는 <b>하양</b>! 빛은 섞을수록 <b>밝아져요</b> ✨</div>
      </div>` },
    { // ② PWM 색 혼합 — 인터랙티브 슬라이더
      html: `<div class="ba rt2">
        <div class="rt-mix"><div class="rt-sw" id="rsw"></div><div class="rt-val"><b id="rhex">#FFFFFF</b><span id="rrgb">R255 · G255 · B255</span></div></div>
        <div class="rt-sliders">
          <label class="rs r">R <input type="range" id="sr" min="0" max="255" value="255"><b id="vr">255</b></label>
          <label class="rs g">G <input type="range" id="sg" min="0" max="255" value="200"><b id="vg">200</b></label>
          <label class="rs b">B <input type="range" id="sb" min="0" max="255" value="60"><b id="vb">60</b></label>
        </div>
        <div class="ba-flow"><b>PWM</b>으로 각 색 밝기(0~255)를 조절 → 슬라이더를 움직여 색을 만들어봐! 🎚️</div>
      </div>`,
      init: (stage) => {
        const sr = stage.querySelector('#sr'), sg = stage.querySelector('#sg'), sb = stage.querySelector('#sb');
        const sw = stage.querySelector('#rsw'), hex = stage.querySelector('#rhex'), rgb = stage.querySelector('#rrgb');
        const vr = stage.querySelector('#vr'), vg = stage.querySelector('#vg'), vb = stage.querySelector('#vb');
        const h = (n) => (+n).toString(16).padStart(2, '0').toUpperCase();
        const upd = () => {
          const r = +sr.value, g = +sg.value, b = +sb.value;
          sw.style.background = `rgb(${r},${g},${b})`; hex.textContent = '#' + h(r) + h(g) + h(b);
          rgb.textContent = `R${r} · G${g} · B${b}`; vr.textContent = r; vg.textContent = g; vb.textContent = b;
        };
        [sr, sg, sb].forEach((s) => s.oninput = upd); upd();
      } },
    { // ③ 활용 — 화면·조명
      html: `<div class="ba rt3"><div class="rt-uses">
        <div class="rt-use u-shake"><span>📱</span>폰 화면</div>
        <div class="rt-use u-swing"><span>📺</span>TV·모니터</div>
        <div class="rt-use u-bounce"><span>💡</span>무드등</div>
        <div class="rt-use u-beep"><span>🎮</span>게임 조명</div>
      </div>
      <div class="ba-flow">화면 속 모든 색은 <b>작은 RGB 픽셀</b>들이 만들어요 — 우리 눈엔 하나의 색으로 보여요! 🌈</div></div>` },
  ];
}

// ───────── 부저 이론 애니메이션(코드로 직접) ─────────
function buzzerTheory() {
  return [
    { // ① 원리: 전기 → 판 떨림 → 음파 → 소리
      html: `<div class="ba ba1">
        <div class="ba-stage">
          <div class="ba-batt">🔋<em>전기</em></div>
          <div class="ba-wire"><i></i><i></i><i></i><i></i></div>
          <div class="ba-piezo"><div class="ba-disc"></div><span class="ba-ring"></span><span class="ba-ring r2"></span><span class="ba-ring r3"></span></div>
          <div class="ba-ear">👂<em>소리!</em></div>
        </div>
        <div class="ba-flow">전기 →&nbsp; <b>판이 빠르게 떨림(진동)</b> &nbsp;→ 공기 흔들림(음파) → 소리</div>
      </div>`,
    },
    { // ② 주파수 = 음 높이 (인터랙티브 파형 + 소리)
      html: `<div class="ba ba2">
        <canvas id="bw" width="680" height="210"></canvas>
        <div class="ba-freqrow"><span class="ba-note" id="bn">미</span> · <b id="bf">330</b> Hz</div>
        <div class="ba-ctrl"><span class="ba-lo">낮은 음</span><input type="range" id="bfreq" min="200" max="780" value="330"><span class="ba-hi">높은 음</span><button class="dbtn ghost" id="bplay">▶ 들어보기</button></div>
      </div>`,
      init: (stage, setRaf) => {
        const cv = stage.querySelector('#bw'), ctx = cv.getContext('2d');
        const range = stage.querySelector('#bfreq'), bf = stage.querySelector('#bf'), bn = stage.querySelector('#bn');
        const N = [[262, '도'], [294, '레'], [330, '미'], [349, '파'], [392, '솔'], [440, '라'], [494, '시'], [523, '도↑']];
        const nameOf = (f) => N.reduce((a, b) => Math.abs(b[0] - f) < Math.abs(a[0] - f) ? b : a)[1];
        let phase = 0;
        const upd = () => { bf.textContent = range.value; bn.textContent = nameOf(+range.value); };
        range.oninput = upd; upd();
        stage.querySelector('#bplay').onclick = () => sfx.note(+range.value, 520);
        const loop = () => {
          const f = +range.value, W = cv.width, H = cv.height;
          ctx.clearRect(0, 0, W, H);
          ctx.strokeStyle = 'rgba(120,190,140,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
          const waves = f / 70, amp = H * 0.32;
          ctx.strokeStyle = '#36a96a'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath();
          for (let x = 0; x <= W; x += 3) { const y = H / 2 - Math.sin((x / W) * Math.PI * 2 * waves + phase) * amp; x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
          ctx.stroke();
          phase += f * 0.00045;
          setRaf(requestAnimationFrame(loop));
        };
        loop();
      },
    },
    { // ③ 활용
      html: `<div class="ba ba3"><div class="ba-uses">
        <div class="ba-use u-shake"><span>⏰</span>알람 시계</div>
        <div class="ba-use u-swing"><span>🔔</span>초인종</div>
        <div class="ba-use u-bounce"><span>🎵</span>멜로디</div>
        <div class="ba-use u-beep"><span>📟</span>알림음</div>
      </div></div>`,
    },
  ];
}

// ───────── 그리기 ─────────
function drawRoom(ctx, st, stations, cfg, VW, VH, roomBg) {
  const t = st?.t || 0, activeId = st?.activeTrigger?.id;
  if (roomBg && roomBg.complete && roomBg.naturalWidth) {
    drawCover(ctx, roomBg, VW, VH);
    ctx.fillStyle = 'rgba(20,12,30,0.06)'; ctx.fillRect(0, 0, VW, VH);
  } else {
    const wall = ctx.createLinearGradient(0, 0, 0, VH * 0.4); wall.addColorStop(0, '#f6ead6'); wall.addColorStop(1, '#ecd8bf');
    ctx.fillStyle = wall; ctx.fillRect(0, 0, VW, VH * 0.4);
    const fl = ctx.createLinearGradient(0, VH * 0.4, 0, VH); fl.addColorStop(0, '#e7cfa6'); fl.addColorStop(1, '#d6b585');
    ctx.fillStyle = fl; ctx.fillRect(0, VH * 0.4, VW, VH * 0.6);
    ctx.strokeStyle = 'rgba(120,90,50,0.16)'; ctx.lineWidth = 2;
    for (let y = VH * 0.45; y < VH; y += 48) { ctx.beginPath(); ctx.moveTo(16, y); ctx.lineTo(VW - 16, y); ctx.stroke(); }
    bunting(ctx, VW, t);
  }
  // 문 쪽 빛 기둥(좌/우 끝) — 가까이 갈수록 환해지는 입구 연출
  const px = st?.player ? st.player.x : VW / 2;
  doorGlow(ctx, VW * 0.05, VH, cfg.signL, 1 - Math.min(1, px / (VW * 0.32)));
  doorGlow(ctx, VW * 0.95, VH, cfg.signR, 1 - Math.min(1, (VW - px) / (VW * 0.32)));
  for (const s of stations) drawSign(ctx, s, s.id === activeId, t);
}

function doorGlow(ctx, x, VH, acc, k) {
  if (k <= 0.02) return;
  const g = ctx.createLinearGradient(x, 0, x, VH); g.addColorStop(0, `rgba(${acc},${0.35 * k})`); g.addColorStop(1, `rgba(${acc},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - 90, 0, 180, VH);
}

// 화살표 푯말(문을 가리킴) — 기둥 + 화살표 보드 + 큰 방향 화살표
function drawSign(ctx, s, active, t) {
  const dir = s.dir, cx = s.cx, boardY = s.signY, baseY = s.postY;
  const acc = s.color || (s.id === 'play' ? '255,140,90' : '120,225,255');
  const pulse = 0.55 + 0.45 * Math.sin(t * 0.12 + (dir > 0 ? 1 : 0));
  const bob = active ? Math.sin(t * 0.12) * 3 : 0, by = boardY + bob;

  // 바닥 풋라이트
  const fg = ctx.createRadialGradient(cx, baseY, 4, cx, baseY, 110);
  fg.addColorStop(0, `rgba(${acc},${active ? 0.5 : 0.3})`); fg.addColorStop(1, `rgba(${acc},0)`);
  ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(cx, baseY, active ? 96 : 76, active ? 26 : 20, 0, 0, 6.283); ctx.fill();
  // 기둥
  const post = ctx.createLinearGradient(cx - 7, 0, cx + 7, 0); post.addColorStop(0, '#6f4a2c'); post.addColorStop(.5, '#8a5e38'); post.addColorStop(1, '#6f4a2c');
  ctx.fillStyle = post; ctx.fillRect(cx - 7, by + 26, 14, baseY - (by + 26));

  // 화살표 보드
  const bw = 232, bh = 78;
  ctx.save();
  ctx.fillStyle = 'rgba(16,12,24,0.88)'; arrowBoard(ctx, cx, by, bw, bh, dir); ctx.fill();
  ctx.shadowColor = `rgba(${acc},${pulse})`; ctx.shadowBlur = 28 * pulse;
  ctx.strokeStyle = `rgba(${acc},1)`; ctx.lineWidth = 4; arrowBoard(ctx, cx, by, bw - 8, bh - 8, dir); ctx.stroke();
  ctx.shadowBlur = 14; ctx.textAlign = 'center';
  const tShift = -dir * 12;
  ctx.fillStyle = '#fff'; ctx.font = '900 24px "Space Grotesk", sans-serif'; ctx.fillText(`${s.icon} ${s.label}`, cx + tShift, by + 1);
  ctx.shadowBlur = 8; ctx.fillStyle = `rgb(${acc})`; ctx.font = '700 12px "Space Grotesk", sans-serif'; ctx.fillText(s.sub, cx + tShift, by + 21);
  ctx.restore();

  // 큰 방향 화살표(문 쪽으로 깜빡)
  ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = `rgba(${acc},${0.6 + 0.4 * Math.sin(t * 0.18)})`;
  ctx.font = '900 34px "Space Grotesk", sans-serif';
  ctx.fillText(dir > 0 ? '▶' : '◀', cx + dir * (bw / 2 + 26) + dir * Math.abs(Math.sin(t * 0.16)) * 8, by + 10);
  ctx.restore(); ctx.textAlign = 'start';
}
function arrowBoard(ctx, cx, cy, w, h, dir) {
  const x = cx - w / 2, y = cy - h / 2, n = 26;
  ctx.beginPath();
  if (dir > 0) { ctx.moveTo(x, y); ctx.lineTo(x + w - n, y); ctx.lineTo(x + w, cy); ctx.lineTo(x + w - n, y + h); ctx.lineTo(x, y + h); }
  else { ctx.moveTo(x + w, y); ctx.lineTo(x + n, y); ctx.lineTo(x, cy); ctx.lineTo(x + n, y + h); ctx.lineTo(x + w, y + h); }
  ctx.closePath();
}
function drawCover(ctx, img, W, H) { const ir = img.naturalWidth / img.naturalHeight, r = W / H; let dw, dh; if (ir > r) { dh = H; dw = H * ir; } else { dw = W; dh = W / ir; } ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh); }
function bunting(ctx, W, t) {
  ctx.save(); ctx.strokeStyle = 'rgba(90,60,40,0.4)'; ctx.lineWidth = 2;
  ctx.beginPath(); for (let x = 0; x <= W; x += 8) ctx.lineTo(x, 16 + Math.sin(x / 90) * 10); ctx.stroke();
  const cols = ['#ff6b6b', '#ffd24a', '#5ad17a', '#6fb7ff', '#b18bff'];
  for (let i = 0, x = 34; x < W; x += 64, i++) {
    const y = 24 + Math.sin(x / 90) * 10, tw = 0.45 + 0.35 * Math.sin(t * 0.1 + i);
    ctx.fillStyle = `rgba(255,240,180,${tw})`; ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.283); ctx.fill();
    ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.arc(x, y, 5.5, 0, 6.283); ctx.fill();
  }
  ctx.restore();
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
