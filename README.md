# Playino · PlayHouse — 거실 레슨

> 층위: `Playino(제품군) › PlayHouse(스마트홈 1호) › 거실(검증 레슨)`

웹 게임(EDDIE 아바타) ↔ 실물 보드(LED) 연동 학습 1레슨(거실)을 만드는
재사용 템플릿. 통과하면 나머지 4방·다른 테마로 복제한다.

## 현재 진행 상태 (구현 순서 §9)

- [x] **STEP 1 — Scaffold**: Vite + 폴더 구조 + `package.json` + 2단 레이아웃(62/38) + `eddie.svg`
- [x] **STEP 2 — 시리얼 코어**: `webserial.js` · `protocol.js` · `provisioning.js`
- [ ] STEP 3~ — 테마 로더 · EDDIE 아바타 · 게임 캔버스 · 에디터 · 폴백 …

> **여기서 멈춤(§9.2).** `L2:1` / `L2:0` 로 **실물 D2 LED** 가 토글되는지
> 사람이 확인한 뒤 다음 단계로 진행한다.

## 실행 / 검증 방법

```bash
npm install
npm run dev      # http://localhost:5173 (Chrome/Edge 데스크톱)
```

1. 우측 패널 **[보드 연결]** → 팝업에서 Arduino/CH340 보드 선택.
2. 자동으로 `PING` 전송 → 1.5초 내 `PLAYHOUSE v*` 수신 시 **연결됨**.
   - 응답 없으면 **"보드 준비"** 모달 → `flashFirmware()`(스텁) → 재시도.
3. **[불 켜기 · L2:1]** / **[불 끄기 · L2:0]** → **실물 D2 LED** 토글 확인.
   - 화면 거실 램프 + EDDIE `success` 글로우가 같은 이벤트에서 점등(§5.5 시그니처).
4. 모든 TX/RX 가 **시리얼 모니터**에 기록된다.

> WebSerial 은 Chrome/Edge 데스크톱 전용. 미지원/HW 없음 → STEP 9 에서 Wokwi 폴백 예정.

## 시리얼 프로토콜 (§3)

라인 단위 ASCII, `\n` 종결, **115200 baud**.

| 방향 | 명령 | 의미 |
|---|---|---|
| H→B | `PING` | 핸드셰이크 |
| H→B | `L<pin>:<0\|1>` | digitalWrite (예 `L2:1`) |
| H→B | `P<pin>:<0-255>` | analogWrite(PWM) |
| B→H | `READY` / `PLAYHOUSE v<n>` / `OK` / `ERR:<msg>` | 부팅·식별·ACK·오류 |

핸드셰이크: 연결 직후 `PING` → 1.5초 내 `PLAYHOUSE v*` 수신 시 통과.

## 폴더 구조

```
playino-playhouse/
├── index.html
├── package.json
├── vite.config.js
├── public/firmware/        # 펌웨어 산출물 + 참조 .ino (별도 작업자)
└── src/
    ├── main.js             # STEP 2 검증 하네스 (연결·핸드셰이크·LED 토글·모니터)
    ├── styles/main.css     # 2단 레이아웃
    ├── assets/eddie.svg    # ★ EDDIE 주인공 에셋 (#eddie/#eddie-eyes/#eddie-glow/#eddie-screen)
    └── serial/
        ├── webserial.js    # 포트 연결·VID/PID·라인 read/write
        ├── protocol.js     # 명령 인코딩/디코딩 (L2:1 등)
        └── provisioning.js # PING 핸드셰이크 + flashFirmware() 스텁
```

> STEP 3 이후에 `engine/`, `editor/`, `panel/`, `fallback/`, `themes/` 가 추가된다.

## HW

Arduino Uno + 5φ LED 5개(`D2~D6`). 거실 = **`D2`**.
펌웨어는 `public/firmware/playhouse-firmware.ino`(부록 A) 계약을 준수.
