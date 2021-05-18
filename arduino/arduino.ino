
#define FASTLED_ALLOW_INTERRUPTS 0
#define FASTLED_INTERRUPT_RETRY_COUNT 1
#include <FastLED.h>
extern "C"
{
#include "interpreter.h"
}

// 784 / 2
#define LED_COUNT 50
#define DATA_PIN 4
// Max amount of routes that can be drawn at once
#define MAX_LINES 32
// Every x other pixel is rendered in the next frame
#define INTERLACE_LEVEL 2
#define MAX_PROGRAM_SIZE 250
#define SHIFT_INTERVAL 100
#define SPLIT_SIZE 2

// A route
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
int bytesToReceive = 0;
int receivePosition = 0;

uint32_t shift = 0;

int interlacing = 0;
unsigned short entryPoint = 12;
uint8_t mem[MAX_PROGRAM_SIZE] = {0x00, 0x00, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x04, 0x00, 0x03, 0x02, 0x14, 0x03, 0x00, 0x30, 0x21, 0x04, 0x03, 0x00, 0x22, 0x03, 0x04, 0xff, 0x00, 0x08, 0x00, 0x00, 0x03, 0x00, 0x08, 0x01, 0x00, 0x01, 0x04, 0x00, 0x03, 0x02, 0x14, 0x03, 0x00, 0x30, 0x21, 0x05, 0x04, 0xff, 0x00, 0x22, 0x02, 0x03, 0x00, 0x08, 0x02, 0x00, 0x0f};

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
        *(uint32_t *)(mem + stackPointer) = (uint32_t)random(256);
        break;
    }
    case 2:
    {
        // int out(int)
        // Return value is passed value
        Serial.println(*(uint32_t *)(mem + stackPointer));
        break;
    }
    case 3:
    {
        // int min(int, int)
        uint32_t op1 = *(uint32_t *)(mem + stackPointer);
        stackPointer += 4;
        uint32_t op2 = *(uint32_t *)(mem + stackPointer);
        *(uint32_t *)(mem + stackPointer) = op1 > op2 ? op2 : op1;
        break;
    }
    case 4:
    {
        // int max(int, int)
        uint32_t op1 = *(uint32_t *)(mem + stackPointer);
        stackPointer += 4;
        uint32_t op2 = *(uint32_t *)(mem + stackPointer);
        *(uint32_t *)(mem + stackPointer) = op1 < op2 ? op2 : op1;
        break;
    }
    case 5:
    {
        // int map(int value, int fromLow, int fromHigh, int toLow, int toHigh)
        // Does the same as https://www.arduino.cc/reference/en/language/functions/math/map/
        uint32_t toLow = *(uint32_t *)(mem + stackPointer);
        stackPointer += 4;
        uint32_t toHigh = *(uint32_t *)(mem + stackPointer);
        stackPointer += 4;
        uint32_t fromHigh = *(uint32_t *)(mem + stackPointer);
        stackPointer += 4;
        uint32_t fromLow = *(uint32_t *)(mem + stackPointer);
        stackPointer += 4;
        uint32_t value = *(uint32_t *)(mem + stackPointer);
        *(uint32_t *)(mem + stackPointer) = map(value, fromLow, fromHigh, toLow, toHigh);
        break;
    }
    case 6:
    {
        // int lerp(int from, int to, int percentage)
        uint32_t percentage = *(uint32_t *)(mem + stackPointer);
        stackPointer += 4;
        uint32_t to = *(uint32_t *)(mem + stackPointer);
        stackPointer += 4;
        uint32_t from = *(uint32_t *)(mem + stackPointer);
        *(uint32_t *)(mem + stackPointer) = from + (percentage / 256.0f) * (to - from);
        break;
    }
    case 7:
    {
        // int clamp(int value, int min, int max)
        uint32_t max = *(uint32_t *)(mem + stackPointer);
        stackPointer += 4;
        uint32_t min = *(uint32_t *)(mem + stackPointer);
        stackPointer += 4;
        uint32_t value = *(uint32_t *)(mem + stackPointer);
        if (value > max)
        {
            *(uint32_t *)(mem + stackPointer) = max;
        }
        else if (value < min)
        {
            *(uint32_t *)(mem + stackPointer) = min;
        }
        else
        {
            *(uint32_t *)(mem + stackPointer) = value;
        }
        break;
    }
    case 8:
    {
        // void hsv(int h, int s, int v)
        // Sets the r, g and b variables using hsv
        uint32_t v = mem[stackPointer];
        stackPointer += 4;
        uint32_t s = mem[stackPointer];
        stackPointer += 4;
        uint32_t h = mem[stackPointer];
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

    // Increasing the baud rate will cause corruption and inconsistency
    Serial.begin(4800);
    Serial.println("Starting...");

    pinMode(LED_BUILTIN, OUTPUT);
    memset(routes, 0, sizeof(LineEffect *) * MAX_LINES);

    FastLED.addLeds<WS2812B, DATA_PIN, GRB>(leds, LED_COUNT);
    FastLED.setBrightness(40);

    for (int i = 0; i < 5; i++)
    {
        digitalWrite(LED_BUILTIN, true);
        delay(50);
        digitalWrite(LED_BUILTIN, false);
        delay(50);
    }

    Serial.println("Ready");

    // Serial.println("Copying program");
    // memcpy(mem, program, sizeof(program));
}

void setColorLine(int start, int end, CRGB color)
{
    for (int i = 0; i < LED_COUNT; i++)
    {
        leds[i] = CRGB(0, 0, 0);
    }

    int dir = end > start ? 1 : -1;
    for (int i = start; i != end && i < LED_COUNT && i >= 0; i += dir)
    {
        leds[i] = color;
    }
}

void handleSetIdle()
{
    Serial.read();
    // idleEffect = Serial.read();
    Serial.print("Set idle effect ");
    // Serial.println(idleEffect);
}

void handleEnableLine()
{
    Serial.read();
    uint8_t id = Serial.read();

    if (id >= MAX_LINES)
    {
        Serial.println("Reached max lines");
        return;
    }

    if (routes[id] != nullptr)
    {
        setColorLine(routes[id]->startLed, routes[id]->endLed, CRGB(0, 0, 0));
        delete routes[id];
    }

    // Enable line effect
    uint8_t r = Serial.read(), g = Serial.read(), b = Serial.read();
    uint16_t startLed = Serial.read() << 8 | Serial.read();
    uint16_t endLed = Serial.read() << 8 | Serial.read();
    uint16_t duration = Serial.read() << 8 | Serial.read();

    uint64_t endTime = duration > 0 ? millis() + duration * 1000 : 0;
    routes[id] = new LineEffect(startLed, endLed, endTime, CRGB(r, g, b));

    Serial.print("Enable line ");
    Serial.print(id);
    Serial.print(", startLed=");
    Serial.print(startLed);
    Serial.print(", endLed=");
    Serial.print(endLed);
    Serial.print(", duration=");
    Serial.println(duration);
}

void handleDisableLine()
{
    Serial.read();
    int id = Serial.read();

    if (routes[id] != nullptr)
    {
        setColorLine(routes[id]->startLed, routes[id]->endLed, CRGB(0, 0, 0));
        delete routes[id];
        routes[id] = nullptr;
    }

    Serial.print("Disable line ");
    Serial.println(id);
}

void handleSetRoom()
{
    Serial.read();
    Serial.read();
    uint8_t room = Serial.read();
    uint64_t endTime = millis() + 10 * 1000;

    switch (room)
    {
    case 0:
        routes[room] = new LineEffect(0, 50, endTime, CRGB(255, 0, 0));
        Serial.println("Room 1");
        break;
    case 1:
        routes[room] = new LineEffect(0, 50, endTime, CRGB(0, 255, 0));
        Serial.println("Room 2");
        break;
    case 2:
        routes[room] = new LineEffect(0, 50, endTime, CRGB(0, 0, 255));
        Serial.println("Room 3");
        break;
    case 3:
        routes[room] = new LineEffect(0, 50, endTime, CRGB(255, 255, 255));
        Serial.println("Room 4");
        break;
    case 4:
        routes[room] = new LineEffect(0, 50, endTime, CRGB(255, 255, 0));
        Serial.println("Room 5");
        break;
    case 5:
        routes[room] = new LineEffect(0, 50, endTime, CRGB(0, 255, 255));
        Serial.println("Room 6");
        break;
    }
}

void handlePackets()
{
    if (receivePosition < bytesToReceive)
    {
        // Receive program
        while (Serial.available() && receivePosition < bytesToReceive)
        {
            Serial.print("receiving ... ");
            Serial.print(receivePosition);
            Serial.print("/");
            Serial.println(bytesToReceive);

            mem[receivePosition++] = Serial.read();
        }
    }
    else
    {
        // Read data packet
        int packetType = Serial.peek();
        switch (packetType)
        {
        case -1:
            break;
        case 1:
            if (Serial.available() >= 2)
                Serial.println(packetType);
            handleSetIdle();
            break;
        case 2:
            if (Serial.available() >= 11)
                handleEnableLine();
            break;
        case 3:
            if (Serial.available() >= 2)
                handleDisableLine();
            break;
        case 4:
            if (Serial.available() >= 3)
                handleSetRoom();
            break;
        case 5:
            if (Serial.available() >= 5)
            {
                // handle program receive
                Serial.read();

                bytesToReceive = Serial.read() << 8 | Serial.read();
                receivePosition = 0;
                entryPoint = Serial.read() << 8 | Serial.read();

                Serial.print("receiving program, size=");
                Serial.print(bytesToReceive);
                Serial.print("/");
                Serial.print(MAX_PROGRAM_SIZE);
                Serial.print(", entryPoint=");
                Serial.println(entryPoint);

                // if (bytesToReceive >= MAX_PROGRAM_SIZE)
                // {
                //     Serial.println("program is too big, not receiving");
                //     while (Serial.available())
                //         Serial.read();
                //     return;
                // }

                memset(mem, 0, MAX_PROGRAM_SIZE);
            }
            break;
        default:
            // Consume invalid byte
            Serial.print("invalid serial byte ");
            Serial.println(Serial.read());
            break;
        }
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
    *(uint32_t *)(mem + 8) = (int)time;
    int res;
    for (int i = interlacing; i < LED_COUNT; i += INTERLACE_LEVEL)
    {
        *(uint32_t *)(mem + 4) = i;
        mem[0] = leds[i].r;
        mem[1] = leds[i].g;
        mem[2] = leds[i].b;
        // *(uint32_t *)(mem + 0) = 0; //leds[i]
        stackPointer = MAX_PROGRAM_SIZE;
        exePointer = entryPoint;
        res = run();
        if (res)
            break;
        leds[i] = CRGB(mem[0], mem[1], mem[2]);
    }
    if (res)
    {
        Serial.print("non 0 exit code ");
        Serial.println(res);
    }
    interlacing++;
    if (interlacing >= INTERLACE_LEVEL)
        interlacing = 0;
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

    if (receivePosition >= bytesToReceive)
    {
        if (anyRoute)
            drawRoutes();
        else
            drawEffect(time);
    }

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
