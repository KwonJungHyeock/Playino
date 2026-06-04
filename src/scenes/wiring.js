// wiring.js — 결선 안내 창 (퀘스트 시작 전)
// 깔끔한 SVG 회로도 + 결선표 + 안전수칙. [결선 완료] → 진행.

import { LED_WIRING } from '../content/wiring.js';

export function openWiring(data = LED_WIRING, { onDone, onClose } = {}) {
  const backdrop = document.createElement('div');
  backdrop.className = 'wire-backdrop';
  backdrop.innerHTML = `
    <div class="wire-panel">
      <header class="wire-head">
        <div><span class="room-chip">결선 STEP</span> <b>${data.title}</b></div>
        <button class="room-x" id="wire-x" title="닫기">✕</button>
      </header>
      <p class="wire-sub">${data.subtitle} · 아래 회로도와 표대로 연결한 뒤 <b>[결선 완료]</b>를 누르세요.</p>
      <div class="wire-body">
        <div class="wire-diagram" id="wire-diagram">${diagramHtml(data)}</div>
        <div class="wire-info">
          <table class="wire-table">
            <thead><tr><th>부품</th><th>핀</th><th>저항</th><th>연결</th></tr></thead>
            <tbody>
              ${data.rows.map((r) => `
                <tr>
                  <td><span class="led-dot" style="background:${r.color}"></span>${r.name}</td>
                  <td><b>${r.pin}</b></td><td>${r.res}</td><td>${r.note}</td>
                </tr>`).join('')}
            </tbody>
          </table>
          <div class="wire-ground">⏚ ${data.ground}</div>
          <div class="wire-safety">
            <div class="wire-safety-title">안전 주의</div>
            <ul>${data.safety.map((s) => `<li>${s}</li>`).join('')}</ul>
          </div>
        </div>
      </div>
      <div class="wire-actions">
        <label class="wire-check"><input type="checkbox" id="wire-ok"/> 회로도/표대로 연결했고 VCC·GND·극성을 확인했어요</label>
        <button class="btn primary" id="wire-done" disabled>결선 완료 ▶</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  // 사진 로드 실패 시 대체(표는 항상 표시되므로 안내만)
  const photo = backdrop.querySelector('.wire-photo');
  if (photo) photo.addEventListener('error', () => {
    const box = backdrop.querySelector('#wire-diagram');
    box.innerHTML = data.id === 'led' ? buildSvg(data) : missingHtml(data);
  });

  const chk = backdrop.querySelector('#wire-ok');
  const done = backdrop.querySelector('#wire-done');
  chk.addEventListener('change', () => { done.disabled = !chk.checked; });
  done.addEventListener('click', () => { backdrop.remove(); onDone?.(); });
  backdrop.querySelector('#wire-x').addEventListener('click', () => { backdrop.remove(); onClose?.(); });
}

function diagramHtml(data) {
  if (data.image) return `<img class="wire-photo" src="${data.image}" alt="${data.title} 회로도"/>`;
  return data.id === 'led' ? buildSvg(data) : missingHtml(data);
}
function missingHtml(data) {
  return `<div class="wire-photo-missing">회로도 이미지가 아직 없어요.<br/>
    아래 <b>결선표</b>를 보고 연결하세요.<br/><br/>
    (이미지를 넣으려면 <code>public/wiring/${data.id}.png</code> 에 저장)</div>`;
}

function buildSvg(data) {
  const ys = [70, 130, 190, 250];
  const railX = 384, padX = 116, ledX = 196, resX = 256;
  let branches = '';
  data.rows.forEach((r, i) => {
    const y = ys[i];
    branches += `
      <text x="100" y="${y + 4}" text-anchor="end" class="svg-pin">${r.pin.replace('D', '')}</text>
      <rect x="104" y="${y - 6}" width="12" height="12" rx="2" fill="#c7d0e0"/>
      <line x1="${padX}" y1="${y}" x2="${ledX - 12}" y2="${y}" stroke="${r.color}" stroke-width="3"/>
      <circle cx="${ledX}" cy="${y}" r="10" fill="${r.color}" stroke="#0c1426" stroke-width="1.5"/>
      <line x1="${ledX + 12}" y1="${y}" x2="${resX}" y2="${y}" stroke="${r.color}" stroke-width="3"/>
      <rect x="${resX}" y="${y - 7}" width="44" height="14" rx="3" fill="#d9b38c" stroke="#8a6a3a"/>
      <text x="${resX + 22}" y="${y + 4}" text-anchor="middle" class="svg-res">220Ω</text>
      <line x1="${resX + 44}" y1="${y}" x2="${railX}" y2="${y}" stroke="#9aa3bd" stroke-width="3"/>`;
  });
  return `
    <svg viewBox="0 0 440 340" width="100%" aria-label="LED 회로도">
      <rect x="20" y="46" width="84" height="252" rx="10" fill="#1f6f8b" stroke="#0e4456" stroke-width="2"/>
      <text x="62" y="40" text-anchor="middle" class="svg-board">Arduino UNO</text>
      ${branches}
      <!-- GND 레일 -->
      <line x1="${railX}" y1="64" x2="${railX}" y2="306" stroke="#9aa3bd" stroke-width="4"/>
      <line x1="${railX}" y1="306" x2="116" y2="306" stroke="#9aa3bd" stroke-width="4"/>
      <rect x="104" y="300" width="12" height="12" rx="2" fill="#c7d0e0"/>
      <text x="100" y="310" text-anchor="end" class="svg-pin">GND</text>
      <text x="${railX + 8}" y="186" class="svg-gnd">GND 레일</text>
    </svg>`;
}
