// login.js — 로그인(플레이어 입장). 미니게임천국 톤(컬러풀)에 맞춘 디자인 + 살아있는 EDDIE.
// 열린 로그인: 아이디/비번 없이도 입장 가능(데모). 배경/캐릭터는 메인페이지와 통일.
import eddieSvg from '../assets/eddie.svg?raw';

export function showLogin(root, { onDone } = {}) {
  root.innerHTML = `
    <div class="lg scene-fade">
      <div class="pm-bg"></div>
      <div class="pm-blobs"><span></span><span></span><span></span><span></span></div>
      <div class="lg-inner">
        <div class="lg-card">
          <div class="lg-brand"><span class="brand-dot"></span>EDUINO AI · 미니게임천국</div>
          <h2 class="lg-title">플레이어 입장 🎮</h2>
          <p class="lg-sub">계정으로 로그인하고 미니게임천국에 입장하세요.<br/><span class="lg-demo">데모 버전 — 그냥 입장할 수 있어요</span></p>
          <label class="lg-label">이메일</label>
          <input class="lg-input" id="lf-email" type="email" placeholder="player1@eduino.io" />
          <label class="lg-label">비밀번호</label>
          <input class="lg-input" id="lf-pw" type="password" placeholder="••••••••" />
          <div class="lg-actions">
            <button class="btn lg-find" id="lf-find">비밀번호 찾기</button>
            <button class="btn primary lg-go" id="lf-login">입장하기 ▶</button>
          </div>
          <div class="lg-foot">이용약관 · 개인정보처리방침</div>
        </div>
        <div class="lg-hero">
          <img class="lg-hero-img" id="lg-hero" alt="EDDIE" hidden />
          <div class="lg-hero-fallback" id="lg-hero-fb">${eddieSvg}</div>
          <div class="lg-speech">같이 입장하자! 🚀</div>
        </div>
      </div>
    </div>`;

  // EDDIE 마스터 히어로가 있으면 SVG 대신 사용
  const heroProbe = new Image();
  heroProbe.onload = () => {
    const img = root.querySelector('#lg-hero'); img.src = heroProbe.src; img.hidden = false;
    root.querySelector('#lg-hero-fb').hidden = true;
  };
  heroProbe.src = '/brand/eddie/eddie-hero.png';

  const go = () => onDone?.();
  root.querySelector('#lf-login').onclick = go;
  root.querySelector('#lf-find').onclick = () => alert('데모 버전이라 비밀번호 없이 바로 입장할 수 있어요!');
  root.querySelector('#lf-pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}
