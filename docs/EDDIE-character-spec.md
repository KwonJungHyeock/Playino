# EDDIE 공식 캐릭터 스펙 & 생성 프롬프트

> 이 문서는 EDDIE 마스코트의 **단일 기준(Single Source of Truth)** 정의서다.
> 새 원본 1장을 여기 스펙대로 생성 → `eddie-hero` 로 확정 → 이후 모든 포즈/코스튬/
> 방향 에셋은 *이 원본을 기준으로* 파생한다(`docs/EDDIE-rig-quickstart.md`,
> `docs/EDDIE-mascot-pipeline.md` 참고).

---

## 1. 디자인 DNA (기존 SVG에서 추출 — 절대 변경 금지)

EDDIE = **둥근 러버호스 카툰톤의 노란 로봇**, **TV/브라운관 머리**에 어두운 스크린,
그 위에 **시안색으로 빛나는 눈**.

| 부위 | 색 (HEX) |
|---|---|
| 보디 옐로우(메인) | `#fbb724` / 음영 `#e0a800` `#cf8f12` / 하이라이트 `#ffe680` `#ffdf66` |
| 머리 스크린(얼굴) | 짙은 남청 `#0e1d2c` `#0b1620` + 글로스 `#9fd6ff` |
| 눈(발광) | 시안·민트 `#46e8ce` `#7fffd4` 코어 `#c2fff2` |
| 베젤·관절(메탈) | 회색 `#6b6c78` `#7f8a96` `#646570` |
| 포인트 악센트 | 살구·레드 `#ff7a7a` (입/볼 등 소량) |

구성 요소: 안테나(머리 위) · 볼트형 "귀"(머리 양옆) · TV 베젤 + 스크린 얼굴 ·
시안 눈 · (작은 입) · 목 볼관절 · 가슴 패널 · 볼관절 어깨/팔꿈치 · 둥근 팔다리 · 발.

---

## 2. 생성 프롬프트 (리그 슬라이스 최적화)

**중요 — 포즈/배경 조건**(이래야 5조각으로 깔끔히 잘림):
- **정면·완전 대칭·차렷에 가까운 자세**
- **양팔을 몸통에서 살짝 띄움**(겨드랑이에 빈 공간 — 팔을 따로 떼어낼 수 있게)
- **안테나는 머리 위로 또렷이, 주변 여백**
- **그림자/광선이 부위끼리 안 뭉치게**(균일한 소프트 조명, 바닥 그림자 없음)
- **평평한 단색 배경**(잘라내기 쉽게 — 순수 마젠타 `#FF00FF` 또는 순수 그린 권장)
- **전신, 발끝까지, 정사각, 여백 충분**

### ▶ 붙여넣기용 프롬프트 (영문 권장 — 이미지 모델 정확도↑)

```
A friendly mascot robot named EDDIE, full body, front view, perfectly symmetrical,
standing straight in a neutral A-pose with both arms held slightly away from the
torso (clear gap under the armpits), hands relaxed at hip level.

Design: 1930s rubber-hose cartoon style with smooth 3D rendered shading (Pixar-like
soft clay look). A rounded YELLOW robot (#fbb724, shadows #e0a800, highlights #ffe680).
Head is a rounded vintage TV / CRT with a dark navy screen face (#0e1d2c) showing two
big glowing CYAN eyes (#46e8ce, bright core #c2fff2) and a small friendly mouth. A
short antenna with a round tip stands straight up on top of the head, with empty space
around it. Small bolt-like "ears" on both sides of the head. Gray metal bezel and ball
joints (#6b6c78) at neck, shoulders and elbows. A small chest panel on the torso.
Rounded rubber-hose arms and legs, simple feet.

Lighting: even soft studio light, no harsh shadows, NO cast shadow on the ground.
Background: completely flat solid magenta (#FF00FF), no gradient, no floor, no props.
Centered, full body with margin, feet fully visible. Square 1:1 composition. High
resolution, crisp clean edges.
```

### ▶ 네거티브(피할 것)
```
no dynamic pose, no twisting, arms not crossing or touching the body, no hands on hips,
no ground shadow, no background scenery, no text, no watermark, not cut off, no
extra limbs, no asymmetry, no motion blur, no busy background.
```

---

## 3. 일관성 팁 (가장 중요)
- 쓰는 도구가 **레퍼런스 이미지**를 받으면(제미나이/파이어플라이 등),
  기존 `eddie-hero` 를 함께 첨부하고 *"같은 캐릭터, 같은 색·비율 유지"* 를 명시 →
  드리프트 최소화.
- 마음에 드는 1장을 고르면 그게 **공식 원본**. 앞으로 wave/cheer/코스튬/4방향은
  전부 이 원본을 *편집*하거나 *레퍼런스로* 재생성. **매번 백지에서 새로 뽑지 않는다.**

---

## 4. 만든 뒤 다음 단계
1. 생성한 이미지의 **단색 배경 제거**(Photopea: Magic Wand 로 마젠타 선택 → Delete →
   투명). 가장자리 정리.
2. 1024×1024 정사각, 발끝 하단으로 정렬해 저장 →
   - `public/brand/eddie/eddie-hero.png` (기본 히어로 교체) 그리고
   - 리그 슬라이스로 진행 → `docs/EDDIE-rig-quickstart.md`
3. `npm run assets` → WebP 변환 → commit/push.
