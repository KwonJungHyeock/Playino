/*
 * playhouse-uno.c — Playino · PlayHouse 펌웨어 (베어메탈 빌드 소스)
 *
 * 이 파일은 public/firmware/playhouse-uno.hex 를 생성하기 위한 ATmega328P
 * 베어메탈 구현이다. 와이어 동작(프로토콜)은 부록 A 의 Arduino 스케치
 * (playhouse-firmware.ino)와 완전히 동일하다. Arduino 코어 없이도
 * 오프라인 컴파일이 가능하도록 레지스터를 직접 다룬다.
 *
 *   H->B : PING / L<pin>:<0|1> / P<pin>:<0-255>
 *   B->H : READY (부팅) / PLAYHOUSE v1 (PING 응답) / OK / ERR:<msg>
 *
 * 빌드:
 *   avr-gcc -mmcu=atmega328p -DF_CPU=16000000UL -Os -o fw.elf playhouse-uno.c
 *   avr-objcopy -O ihex -R .eeprom fw.elf playhouse-uno.hex
 */

#include <avr/io.h>
#include <stdlib.h>
#include <string.h>

#define FW_ID "PLAYHOUSE v1"

/* ---- UART (115200 @ 16MHz, U2X) ---- */
static void uart_init(void) {
    UBRR0H = 0;
    UBRR0L = 16;                       /* 16MHz/(8*(16+1)) = 117647 ~ +2.1% */
    UCSR0A = (1 << U2X0);
    UCSR0B = (1 << RXEN0) | (1 << TXEN0);
    UCSR0C = (1 << UCSZ01) | (1 << UCSZ00); /* 8N1 */
}
static void uart_tx(char c) {
    while (!(UCSR0A & (1 << UDRE0))) {}
    UDR0 = c;
}
static void uart_print(const char *s) { while (*s) uart_tx(*s++); }
static void uart_println(const char *s) { uart_print(s); uart_tx('\n'); }
static char uart_rx(void) {
    while (!(UCSR0A & (1 << RXC0))) {}
    return UDR0;
}

/* ---- PWM 타이머 초기화 (analogWrite 용, 핀 3/5/6/9/10/11) ---- */
static void pwm_init(void) {
    TCCR0A = (1 << WGM01) | (1 << WGM00);            /* Fast PWM */
    TCCR0B = (1 << CS01);                            /* presc 8 */
    TCCR1A = (1 << WGM10);                           /* 8-bit Fast PWM */
    TCCR1B = (1 << WGM12) | (1 << CS11);             /* presc 8 */
    TCCR2A = (1 << WGM21) | (1 << WGM20);            /* Fast PWM */
    TCCR2B = (1 << CS22);                            /* presc 64 */
}

static void set_output(uint8_t pin) {
    if (pin <= 7)       DDRD |= (1 << pin);
    else if (pin <= 13) DDRB |= (1 << (pin - 8));
}

static void pwm_disconnect(uint8_t pin) {
    switch (pin) {
        case 6:  TCCR0A &= ~(1 << COM0A1); break;
        case 5:  TCCR0A &= ~(1 << COM0B1); break;
        case 9:  TCCR1A &= ~(1 << COM1A1); break;
        case 10: TCCR1A &= ~(1 << COM1B1); break;
        case 11: TCCR2A &= ~(1 << COM2A1); break;
        case 3:  TCCR2A &= ~(1 << COM2B1); break;
        default: break;
    }
}

/* digitalWrite */
static void pin_digital(uint8_t pin, uint8_t v) {
    set_output(pin);
    pwm_disconnect(pin);
    if (pin <= 7) {
        if (v) PORTD |= (1 << pin); else PORTD &= ~(1 << pin);
    } else if (pin <= 13) {
        uint8_t b = pin - 8;
        if (v) PORTB |= (1 << b); else PORTB &= ~(1 << b);
    }
}

/* analogWrite (HW PWM on timer pins, 그 외는 임계값) */
static void pin_analog(uint8_t pin, uint8_t val) {
    set_output(pin);
    if (val == 0)   { pin_digital(pin, 0); return; }
    if (val == 255) { pin_digital(pin, 1); return; }
    switch (pin) {
        case 6:  TCCR0A |= (1 << COM0A1); OCR0A = val; break;
        case 5:  TCCR0A |= (1 << COM0B1); OCR0B = val; break;
        case 9:  TCCR1A |= (1 << COM1A1); OCR1A = val; break;
        case 10: TCCR1A |= (1 << COM1B1); OCR1B = val; break;
        case 11: TCCR2A |= (1 << COM2A1); OCR2A = val; break;
        case 3:  TCCR2A |= (1 << COM2B1); OCR2B = val; break;
        default: pin_digital(pin, val >= 128 ? 1 : 0); break;
    }
}

static void handle(char *line) {
    if (strcmp(line, "PING") == 0) { uart_println(FW_ID); return; }

    char type = line[0];
    char *colon = strchr(line, ':');
    if (!colon) { uart_println("ERR:format"); return; }

    int pin = atoi(line + 1);          /* atoi 는 ':' 앞 숫자까지만 파싱 */
    int val = atoi(colon + 1);

    if (pin < 0 || pin > 13) { uart_println("ERR:pin"); return; }

    if (type == 'L')      { pin_digital(pin, val ? 1 : 0); uart_println("OK"); }
    else if (type == 'P') {
        if (val < 0) val = 0;
        if (val > 255) val = 255;
        pin_analog(pin, (uint8_t)val); uart_println("OK");
    }
    else                  { uart_println("ERR:cmd"); }
}

int main(void) {
    /* D2~D6 출력 (거실=D2 등) — 부록 A 와 동일 */
    for (uint8_t p = 2; p <= 6; p++) set_output(p);

    uart_init();
    pwm_init();
    uart_println("READY");

    char buf[40];
    uint8_t len = 0;
    for (;;) {
        char c = uart_rx();
        if (c == '\r') continue;
        if (c == '\n') {
            buf[len] = 0;
            /* 앞뒤 공백 trim */
            char *s = buf;
            while (*s == ' ' || *s == '\t') s++;
            uint8_t e = strlen(s);
            while (e > 0 && (s[e-1] == ' ' || s[e-1] == '\t')) s[--e] = 0;
            if (e > 0) handle(s);
            len = 0;
            continue;
        }
        if (len < sizeof(buf) - 1) buf[len++] = c;
    }
}
