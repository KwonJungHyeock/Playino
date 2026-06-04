// login.js — 인트로 다음 로그인 페이지 (열린 로그인: 아이디/비번 없이도 통과)
import eddieSvg from '../assets/eddie.svg?raw';

export function showLogin(root, { onDone } = {}) {
  root.innerHTML = `
    <div class="login scene-fade">
      <div class="login-card">
        <div class="login-brand">
          <div class="lb-tag"><span class="brand-dot"></span>AIoT 교육 플랫폼</div>
          <h1 class="intro-title gradient">Eduino <span>AI</span></h1>
          <p class="intro-sub">AIoT 교육 플랫폼</p>
          <p class="lb-desc">코딩·교구·AI 학습을 한곳에,<br/>모든 수업환경에 적용 가능한 학습 플랫폼.</p>
          <div class="lb-eddie">${eddieSvg}</div>
        </div>
        <div class="login-form">
          <div class="lf-tabs">
            <button class="lf-tab active" data-tab="teacher">교사용</button>
            <button class="lf-tab" data-tab="student">학생용</button>
          </div>
          <h2 class="lf-title">로그인</h2>
          <p class="lf-sub">에듀이노 계정으로 로그인해주세요. <span class="lf-open">(데모: 그냥 로그인 가능)</span></p>
          <label class="lf-label">이메일</label>
          <input class="lf-input" id="lf-email" type="email" placeholder="teacher1@eduino.io" />
          <label class="lf-label">비밀번호</label>
          <input class="lf-input" id="lf-pw" type="password" placeholder="••••••••" />
          <div class="lf-actions">
            <button class="btn" id="lf-find">비밀번호 생성/찾기</button>
            <button class="btn primary" id="lf-login">로그인 ▶</button>
          </div>
          <div class="lf-foot">이용약관 · 개인정보처리방침</div>
        </div>
      </div>
    </div>`;

  root.querySelectorAll('.lf-tab').forEach((b) =>
    (b.onclick = () => root.querySelectorAll('.lf-tab').forEach((x) => x.classList.toggle('active', x === b))));
  const go = () => onDone?.();
  root.querySelector('#lf-login').onclick = go;
  root.querySelector('#lf-find').onclick = () => alert('데모 버전이라 비밀번호 없이 바로 로그인할 수 있어요!');
  root.querySelector('#lf-pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}
