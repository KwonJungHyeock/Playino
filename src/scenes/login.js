// login.js — 로그인(플레이어 입장). 미니게임천국 톤 + 메인과 동일 완성도(배지·사운드·말풍선·인터랙션).
// 열린 로그인: 아이디/비번 없이도 입장 가능(데모).
import { mountEddieRig } from '../app/eddieRig.js';
import { sfx } from '../app/sfx.js';

const LINES = ['같이 입장하자! 🚀', '준비됐어? 바로 들어가자!', '네 계정으로 천국 입장! 🎮', '클리어하러 가볼까?'];

export function showLogin(root, { onDone } = {}) {
  root.innerHTML = `
    <div class="lg scene-fade">
      <div class="pm-bg"></div>
      <div class="pm-blobs"><span></span><span></span><span></span><span></span></div>
      <button class="snd-toggle" id="snd-toggle" title="소리 켜기/끄기">${sfx.muted ? '🔇' : '🔊'}</button>
      <div class="brand-badge"><span class="brand-dot"></span>Eduino&nbsp;<b>AI</b></div>
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
        <div class="lg-hero" id="lg-hero">
          <div class="lg-speech" id="lg-speech" hidden></div>
        </div>
      </div>
    </div>`;

  const rig = mountEddieRig(root.querySelector('#lg-hero'));

  // EDDIE 말풍선 순환 + 클릭 반응
  const say = root.querySelector('#lg-speech');
  let i = 0, sayTimer = null;
  const show = (n) => { say.textContent = LINES[n % LINES.length]; say.hidden = false; say.classList.remove('pop'); void say.offsetWidth; say.classList.add('pop'); };
  setTimeout(() => { show(0); sayTimer = setInterval(() => show(++i), 4200); }, 700);
  rig.addEventListener('click', () => { sfx.pop(); show(++i); });

  // 사운드 토글
  const snd = root.querySelector('#snd-toggle');
  snd.onclick = () => { const m = sfx.toggle(); snd.textContent = m ? '🔇' : '🔊'; if (!m) sfx.click(); };

  // 로그인
  const go = () => { sfx.start(); onDone?.(); };
  const login = root.querySelector('#lf-login');
  login.onclick = go;
  login.addEventListener('mouseenter', () => sfx.hover());
  root.querySelector('#lf-find').onclick = () => { sfx.click(); alert('데모 버전이라 비밀번호 없이 바로 입장할 수 있어요!'); };
  root.querySelector('#lf-pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });

  // 정리
  const lg = root.querySelector('.lg');
  const obs = new MutationObserver(() => { if (!document.body.contains(lg)) { clearInterval(sayTimer); obs.disconnect(); } });
  obs.observe(document.body, { childList: true, subtree: true });
}
