# public/firmware/

이 폴더에는 보드용 펌웨어 산출물이 들어갑니다 (별도 작업자 제공, §0 / 부록 B).

- `playhouse-uno.hex` — Arduino Uno 용 (STK500 굽기)
- (ESP 계열은 추후 `.bin`, esptool-js)

프로토타입(`flashFirmware()`)은 스텁이라 이 파일 없이도 흐름이 깨지지 않습니다.
펌웨어는 **부록 A 프로토콜 계약**(`playhouse-firmware.ino`)을 반드시 준수해야 합니다.
참조 소스: `playhouse-firmware.ino`.
