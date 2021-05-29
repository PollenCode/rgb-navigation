#pragma once
#define FASTLED_ALLOW_INTERRUPTS 0
#define FASTLED_INTERRUPT_RETRY_COUNT 1
#include <FastLED.h>
extern "C"
{
#include "interpreter.h"
}

// Uncomment if using in production
// #define PRODUCTION

#define BRIGHTNESS 40
#define BAUD_RATE 115200
#define LED_COUNT 50
#define DATA_PIN 4
// Max amount of routes that can be drawn at once
#define MAX_LINES 32
// Every x other pixel is rendered in the next frame
#define INTERLACE_LEVEL 2
#define MAX_PROGRAM_SIZE 200
#define SHIFT_INTERVAL 100
#define SPLIT_SIZE 2

#ifdef PRODUCTION
#define BRIGHTNESS 255
#define MAX_PROGRAM_SIZE 2000
#define LED_COUNT 784
#endif

struct LineEffect
{
    uint16_t startLed;
    uint16_t endLed;
    uint64_t endTime;
    CRGB color;

    LineEffect(uint16_t startLed, uint16_t endLed, uint64_t endTime, CRGB color) : startLed(startLed), endLed(endLed), endTime(endTime), color(color) {}
};

LineEffect *routes[MAX_LINES] = {0};
CRGB leds[LED_COUNT];
uint16_t fpsCounter = 0;
uint64_t lastShown = 0;
CRGB currentColors[MAX_LINES];

uint32_t shift = 0;
uint8_t idCounter = 0;

int effectInterlacing = 0;
unsigned short effectEntryPoint = 12;
uint8_t effectProgram[MAX_PROGRAM_SIZE] = {0x00, 0x00, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x04, 0x00, 0x03, 0x02, 0x14, 0x03, 0x00, 0x30, 0x21, 0x04, 0x03, 0x00, 0x22, 0x03, 0x04, 0xff, 0x00, 0x08, 0x00, 0x00, 0x03, 0x00, 0x08, 0x01, 0x00, 0x01, 0x04, 0x00, 0x03, 0x02, 0x14, 0x03, 0x00, 0x30, 0x21, 0x05, 0x04, 0xff, 0x00, 0x22, 0x02, 0x03, 0x00, 0x08, 0x02, 0x00, 0x0f};

#define PROGRAM_INDEX32(address) *(int32_t *)(effectProgram + address)

void setColorLine(int start, int end, CRGB color);

bool functionHandler(uint8_t id)
{
    // Handles the CALL instruction
    // NOTE: function parameters are pushed on the stack from last to first
    switch (id)
    {
    case 1:
    {
        // byte random()
        stackPointer -= 4;
        *(int32_t *)(effectProgram + stackPointer) = (int32_t)random(256);
        break;
    }
    // case 2:
    // {
    //     // int out(int)
    //     // Return value is passed value
    //     Serial.println(*(int32_t *)(mem + stackPointer));
    //     break;
    // }
    case 3:
    {
        // int min(int, int)
        // int32_t op1 = *(int32_t *)(effectProgram + stackPointer);
        int32_t op1 = INDEX32(stackPointer)
            stackPointer += 4;
        int32_t op2 = *(int32_t *)(effectProgram + stackPointer);
        *(int32_t *)(effectProgram + stackPointer) = op1 > op2 ? op2 : op1;
        break;
    }
    case 4:
    {
        // int max(int, int)
        int32_t op1 = *(int32_t *)(effectProgram + stackPointer);
        stackPointer += 4;
        int32_t op2 = *(int32_t *)(effectProgram + stackPointer);
        *(int32_t *)(effectProgram + stackPointer) = op1 < op2 ? op2 : op1;
        break;
    }
    case 5:
    {
        // int map(int value, int fromLow, int fromHigh, int toLow, int toHigh)
        // Does the same as https://www.arduino.cc/reference/en/language/functions/math/map/
        int32_t toLow = *(int32_t *)(effectProgram + stackPointer);
        stackPointer += 4;
        int32_t toHigh = *(int32_t *)(effectProgram + stackPointer);
        stackPointer += 4;
        int32_t fromHigh = *(int32_t *)(effectProgram + stackPointer);
        stackPointer += 4;
        int32_t fromLow = *(int32_t *)(effectProgram + stackPointer);
        stackPointer += 4;
        int32_t value = *(int32_t *)(effectProgram + stackPointer);
        *(int32_t *)(effectProgram + stackPointer) = map(value, fromLow, fromHigh, toLow, toHigh);
        break;
    }
    case 6:
    {
        // int lerp(int from, int to, int percentage)
        int32_t percentage = *(int32_t *)(effectProgram + stackPointer);
        stackPointer += 4;
        int32_t to = *(int32_t *)(effectProgram + stackPointer);
        stackPointer += 4;
        int32_t from = *(int32_t *)(effectProgram + stackPointer);
        *(int32_t *)(effectProgram + stackPointer) = from + (percentage / 256.0f) * (to - from);
        break;
    }
    case 7:
    {
        // int clamp(int value, int min, int max)
        int32_t max = *(int32_t *)(effectProgram + stackPointer);
        stackPointer += 4;
        int32_t min = *(int32_t *)(effectProgram + stackPointer);
        stackPointer += 4;
        int32_t value = *(int32_t *)(effectProgram + stackPointer);
        if (value > max)
        {
            *(int32_t *)(effectProgram + stackPointer) = max;
        }
        else if (value < min)
        {
            *(int32_t *)(effectProgram + stackPointer) = min;
        }
        else
        {
            *(int32_t *)(effectProgram + stackPointer) = value;
        }
        break;
    }
    case 8:
    {
        // void hsv(int h, int s, int v)
        // Sets the r, g and b variables using hsv
        uint8_t v = effectProgram[stackPointer];
        stackPointer += 4;
        uint8_t s = effectProgram[stackPointer];
        stackPointer += 4;
        uint8_t h = effectProgram[stackPointer];
        stackPointer += 4;
        const CHSV hsv(h, s, v);
        // Places rgb in 0,1,2 of mem
        hsv2rgb_rainbow(hsv, *(CRGB *)mem);
        break;
    }
    default:
        Serial.print("invalid call ");
        Serial.println(id);
        return false;
    }
    return true;
}

void setup()
{
    executed = 0;
    callHandler = functionHandler;

    Serial.begin(BAUD_RATE);
    Serial.println("Starting...");

    pinMode(LED_BUILTIN, OUTPUT);
    memset(routes, 0, sizeof(LineEffect *) * MAX_LINES);

    delay(500);

    FastLED.addLeds<WS2812B, DATA_PIN, GRB>(leds, LED_COUNT);
    FastLED.setBrightness(BRIGHTNESS);

    Serial.println("Done");

    for (int i = 0; i < 5; i++)
    {
        digitalWrite(LED_BUILTIN, true);
        delay(50);
        digitalWrite(LED_BUILTIN, false);
        delay(50);
    }
}

void setColorLine(int start, int end, CRGB color)
{
    if (start > end)
    {
        for (int i = end; i <= start; i++)
            leds[i] = color;
    }
    else
    {
        for (int i = start; i <= end; i++)
            leds[i] = color;
    }
}

void handleEnableLine()
{
    // Enable line effect
    uint8_t r = Serial.read(), g = Serial.read(), b = Serial.read();
    uint16_t startLed = Serial.read() << 8 | Serial.read();
    uint16_t endLed = Serial.read() << 8 | Serial.read();
    uint16_t duration = Serial.read() << 8 | Serial.read();

    // Check if there already exists a line with this range
    bool exist = false;
    uint8_t id;
    for (uint8_t i = 0; i <= MAX_LINES; i++)
    {
        if (routes[i] && routes[i]->startLed == startLed && routes[i]->endLed == endLed)
        {
            id = i;
            exist = true;
            break;
        }
    }
    if (!exist)
    {
        if (idCounter++ >= MAX_LINES)
            idCounter = 0;
        id = idCounter;
    }

    uint64_t endTime = duration > 0 ? millis() + duration * 1000 : 0;
    routes[id] = new LineEffect(startLed, endLed, endTime, CRGB(r, g, b));

    // Serial.print("Enable line ");
    // Serial.print(id);
    // Serial.print(", startLed=");
    // Serial.print(startLed);
    // Serial.print(", endLed=");
    // Serial.print(endLed);
    // Serial.print(", duration=");
    // Serial.println(duration);
}

void handlePackets()
{
    int packetType = Serial.peek();
    switch (packetType)
    {
    case -1:
        break;
    case 2:
        if (Serial.available() >= 11)
        {
            // Consume packettype
            Serial.read();
            handleEnableLine();
        }
        break;
    case 5:
        if (Serial.available() >= 5)
        {
            // Consume packettype
            Serial.read();

            // Handle program receive
            int bytesToReceive = Serial.read() << 8 | Serial.read();
            int receivePosition = 0;
            effectEntryPoint = Serial.read() << 8 | Serial.read();

            Serial.print("receiving program, size=");
            Serial.print(bytesToReceive);
            Serial.print("/");
            Serial.print(MAX_PROGRAM_SIZE);
            Serial.print(", entryPoint=");
            Serial.println(effectEntryPoint);

            if (bytesToReceive >= MAX_PROGRAM_SIZE)
            {
                Serial.println("program is too big, not receiving");
                while (Serial.available())
                    Serial.read();
                return;
            }

            memset(effectProgram, 0, MAX_PROGRAM_SIZE);
            memset(leds, 0, LED_COUNT * sizeof(CRGB));

            while (receivePosition < bytesToReceive)
            {
                if (Serial.available() <= 0)
                    continue;

                effectProgram[receivePosition++] = Serial.read();
            }

            Serial.println("receiving done :DDDDDD");
        }
        break;
    default:
        // Consume invalid byte
        Serial.print("invalid serial byte ");
        Serial.println(Serial.read());
        break;
    }
}

void drawRoutes()
{
    for (int i = 0; i < LED_COUNT; i++)
    {
        byte currentColorCount = 0;
        bool high = false;
        bool low = false;
        memset(currentColors, 0, MAX_LINES * sizeof(CRGB));
        for (byte j = 0; j < MAX_LINES; j++)
        {
            if (((routes[j]->startLed <= i && routes[j]->endLed >= i) ||
                 (routes[j]->startLed >= i && routes[j]->endLed <= i)) &&
                routes[j] != nullptr)
            {
                currentColors[currentColorCount] = routes[j]->color;
                currentColorCount++;
                if (routes[j]->startLed < routes[j]->endLed)
                    high = true;
                else if (routes[j]->startLed > routes[j]->endLed)
                    low = true;
            }
        }
        if (currentColorCount == 0)
        {
            leds[i] = CRGB(0, 0, 0);
            continue;
        }
        int colorId = (i / SPLIT_SIZE) % currentColorCount;
        if (high == true && low == false && currentColorCount > 1)
        {
            colorId = (i - shift / SHIFT_INTERVAL + SPLIT_SIZE * currentColorCount) / SPLIT_SIZE % currentColorCount;
        }
        else if (high == false && low == true && currentColorCount > 1)
        {
            colorId = (i + shift / SHIFT_INTERVAL) / SPLIT_SIZE % currentColorCount;
        }
        leds[i] = currentColors[colorId];
    }
    shift++;
}

void drawEffect(uint32_t time)
{
    // Set timer int variable which is located at 8
    *(uint32_t *)(effectProgram + 8) = (uint32_t)time;

    // Execute program for every led on the strip
    int res;
    for (int i = effectInterlacing; i < LED_COUNT; i += INTERLACE_LEVEL)
    {
        // Set index int variable which is located at 4
        *(uint32_t *)(effectProgram + 4) = i;
        // Set red byte variable which is located at 0
        effectProgram[0] = leds[i].r;
        // Set green byte variable which is located at 1
        effectProgram[1] = leds[i].g;
        // Set blue byte variable which is located at 2
        effectProgram[2] = leds[i].b;

        stackPointer = MAX_PROGRAM_SIZE;
        exePointer = effectEntryPoint;
        res = run();
        if (res)
            break;

        leds[i] = CRGB(effectProgram[0], effectProgram[1], effectProgram[2]);
    }

    if (res)
    {
        Serial.print("non 0 exit code ");
        Serial.println(res);
    }

    effectInterlacing++;
    if (effectInterlacing >= INTERLACE_LEVEL)
        effectInterlacing = 0;
}

void loop()
{
    handlePackets();

    uint64_t time = millis();

    bool anyRoute = false;
    for (int i = 0; i < MAX_LINES; i++)
    {
        LineEffect *le = routes[i];
        if (!le)
            continue;

        // Delete line if it has expired
        if (le->endTime != 0 && le->endTime <= time)
        {
            setColorLine(le->startLed, le->endLed, CRGB(0, 0, 0));
            delete le;
            routes[i] = nullptr;
            continue;
        }

        anyRoute = true;
    }

    if (anyRoute)
        drawRoutes();
    else
        drawEffect(time);

    fpsCounter++;
    if (time - lastShown >= 1000)
    {
        Serial.print("FPS: ");
        Serial.println(fpsCounter);
        Serial.print("executed: ");
        Serial.println(executed);
        // Serial.print("a: ");
        // Serial.println(*(uint32_t *)(mem + 0xc));
        // Serial.print((int32_t)(executed & 0xFFFFFFFF));
        // Serial.println((int32_t)(executed >> 32) & 0xFFFFFFFF);
        lastShown = time;
        fpsCounter = 0;
        executed = 0;
    }

    FastLED.show();
}
