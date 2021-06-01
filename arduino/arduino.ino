#pragma once
#define FASTLED_ALLOW_INTERRUPTS 0
#define FASTLED_INTERRUPT_RETRY_COUNT 1
#include <FastLED.h>
extern "C"
{
#include "interpreter.h"
}

<<<<<<< HEAD
#define BAUD_RATE 115200

// 784 / 2
#define LED_COUNT 784
=======
// Uncomment if using in production
// #define PRODUCTION

#define BRIGHTNESS 40
#define LED_ORDER RGB
#define LED_COUNT 50
#define BAUD_RATE 4800
>>>>>>> ec5d91073185d12108cc96524cb044da25922e2d
#define DATA_PIN 4
// Max amount of routes that can be drawn at once
#define MAX_LINES 32
// Every x other pixel is rendered in the next frame
#define INTERLACE_LEVEL 2
<<<<<<< HEAD
#define MAX_PROGRAM_SIZE 1000
#define SHIFT_INTERVAL 100
#define SPLIT_SIZE 2
=======
// The max size of an idle program, must be aligned to 4
#define MAX_PROGRAM_SIZE 200
#define ROUTE_SHIFT_INTERVAL 500
#define ROUTE_BLEND_FACTOR 35
#define ROUTE_SPLIT_SIZE 3

#ifdef PRODUCTION
#define BRIGHTNESS 255
#define LED_ORDER RGB
#define LED_COUNT 784
#define BAUD_RATE 115200
#define DATA_PIN 4
#define MAX_PROGRAM_SIZE 2000
#endif
>>>>>>> ec5d91073185d12108cc96524cb044da25922e2d

struct LineEffect
{
    uint16_t startLed;
    uint16_t endLed;
    uint64_t endTime;
    CRGB color;

    LineEffect(uint16_t startLed, uint16_t endLed, uint64_t endTime, CRGB color) : startLed(startLed), endLed(endLed), endTime(endTime), color(color) {}
};

uint32_t fpsCounter = 0;
uint64_t lastShownInfoTime = 0;

CRGB leds[LED_COUNT];

LineEffect *routes[MAX_LINES] = {0};
CRGB routeColors[MAX_LINES];
uint8_t routeIdCounter = 0;

int effectInterlacing = 0;
unsigned short effectEntryPoint = 12;
uint8_t mem[MAX_PROGRAM_SIZE] = {0x00, 0x00, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x04, 0x00, 0x03, 0x02, 0x14, 0x03, 0x00, 0x30, 0x21, 0x04, 0x03, 0x00, 0x22, 0x03, 0x04, 0xff, 0x00, 0x08, 0x00, 0x00, 0x03, 0x00, 0x08, 0x01, 0x00, 0x01, 0x04, 0x00, 0x03, 0x02, 0x14, 0x03, 0x00, 0x30, 0x21, 0x05, 0x04, 0xff, 0x00, 0x22, 0x02, 0x03, 0x00, 0x08, 0x02, 0x00, 0x0f};
int lastExitCode = 0;

#define PROGRAM_INDEX32(address) *(int32_t *)(mem + address)

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
        PROGRAM_INDEX32(stackPointer) = (int32_t)random(256);
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
        int32_t op1 = PROGRAM_INDEX32(stackPointer);
        stackPointer += 4;
        int32_t op2 = PROGRAM_INDEX32(stackPointer);
        PROGRAM_INDEX32(stackPointer) = op1 > op2 ? op2 : op1;
        break;
    }
    case 4:
    {
        // int max(int, int)
        int32_t op1 = PROGRAM_INDEX32(stackPointer);
        stackPointer += 4;
        int32_t op2 = PROGRAM_INDEX32(stackPointer);
        PROGRAM_INDEX32(stackPointer) = op1 < op2 ? op2 : op1;
        break;
    }
    case 5:
    {
        // int map(int value, int fromLow, int fromHigh, int toLow, int toHigh)
        // Does the same as https://www.arduino.cc/reference/en/language/functions/math/map/
        int32_t toLow = PROGRAM_INDEX32(stackPointer);
        stackPointer += 4;
        int32_t toHigh = PROGRAM_INDEX32(stackPointer);
        stackPointer += 4;
        int32_t fromHigh = PROGRAM_INDEX32(stackPointer);
        stackPointer += 4;
        int32_t fromLow = PROGRAM_INDEX32(stackPointer);
        stackPointer += 4;
        int32_t value = PROGRAM_INDEX32(stackPointer);
        PROGRAM_INDEX32(stackPointer) = map(value, fromLow, fromHigh, toLow, toHigh);
        break;
    }
    case 6:
    {
        // int lerp(int from, int to, int percentage)
        int32_t percentage = PROGRAM_INDEX32(stackPointer);
        stackPointer += 4;
        int32_t to = PROGRAM_INDEX32(stackPointer);
        stackPointer += 4;
        int32_t from = PROGRAM_INDEX32(stackPointer);
        PROGRAM_INDEX32(stackPointer) = from + (percentage / 256.0f) * (to - from);
        break;
    }
    case 7:
    {
        // int clamp(int value, int min, int max)
        int32_t max = PROGRAM_INDEX32(stackPointer);
        stackPointer += 4;
        int32_t min = PROGRAM_INDEX32(stackPointer);
        stackPointer += 4;
        int32_t value = PROGRAM_INDEX32(stackPointer);
        if (value > max)
        {
            PROGRAM_INDEX32(stackPointer) = max;
        }
        else if (value < min)
        {
            PROGRAM_INDEX32(stackPointer) = min;
        }
        else
        {
            PROGRAM_INDEX32(stackPointer) = value;
        }
        break;
    }
    case 8:
    {
        // void hsv(int h, int s, int v)
        // Sets the r, g and b variables using hsv
        uint8_t v = mem[stackPointer];
        stackPointer += 4;
        uint8_t s = mem[stackPointer];
        stackPointer += 4;
        uint8_t h = mem[stackPointer];
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

    FastLED.addLeds<WS2812B, DATA_PIN, LED_ORDER>(leds, LED_COUNT);
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

<<<<<<< HEAD
//    bool exist = false;
//    for (byte i = 0; i <= MAX_LINES; i++)
//    {
//        if (routes[i]->startLed == startLed && routes[i]->endLed == endLed)
//        {
//            id = i;
//            exist = true;
//            //Serial.print("hit");
//            //break;
//        }
//    }
//
//    if (exist == false)
//    {
//        id = newId == (MAX_LINES - 1) ? newId = 0 : newId++;
//    }
=======
    // Check if there already exists a line with this range
    bool exist = false;
    uint8_t id;
    for (uint8_t i = 0; i < MAX_LINES; i++)
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
        if (routeIdCounter++ >= MAX_LINES)
            routeIdCounter = 0;
        id = routeIdCounter;
    }
>>>>>>> ec5d91073185d12108cc96524cb044da25922e2d

    uint64_t endTime = millis() + duration * 1000;
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
        if (Serial.available() >= 10)
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

            effectEntryPoint = Serial.read() << 8 | Serial.read();

            if (bytesToReceive >= MAX_PROGRAM_SIZE)
            {
                Serial.print("program is too big (");
                Serial.print(bytesToReceive);
                Serial.print("/");
                Serial.print(MAX_PROGRAM_SIZE);
                Serial.println("), not receiving");

                while (Serial.available())
                    Serial.read();
                return;
            }

            // Remove previous program
            memset(mem, 0, MAX_PROGRAM_SIZE);
            // Set all leds to black
            memset(leds, 0, LED_COUNT * sizeof(CRGB));

            // Keep receiving bytes until reached bytesToReceive
            int receivePosition = 0;
            while (receivePosition < bytesToReceive)
            {
                if (Serial.available() <= 0)
                    continue;

                mem[receivePosition++] = Serial.read();
            }

            Serial.print("received program successfully :DDDDD (size=");
            Serial.print(bytesToReceive);
            Serial.print("/");
            Serial.print(MAX_PROGRAM_SIZE);
            Serial.print(", entryPoint=");
            Serial.print(effectEntryPoint);
            Serial.println(")");
        }
        break;
    case 6:
    {
        if (Serial.available() >= 8)
        {
            // Consume packettype
            Serial.read();

            uint16_t location = Serial.read() << 8 | Serial.read();
            uint8_t size = Serial.read();
            int32_t value = Serial.read() << 24 | Serial.read() << 16 | Serial.read() << 8 | Serial.read();

            if (location >= MAX_PROGRAM_SIZE - size)
            {
                Serial.println("set var location too high");
                return;
            }

            if (size == 4)
            {
                PROGRAM_INDEX32(location) = value;
            }
            else if (size == 1)
            {
                mem[location] = value;
            }
            else
            {
                Serial.println("not setting var, invalid size");
                return;
            }

            Serial.print("set var at ");
            Serial.print(location);
            Serial.print(" to ");
            Serial.println(value);
        }
        break;
    }
    default:
        // Consume invalid bytes (packet starts with invalid packet type)
        Serial.print("consuming ");
        Serial.print(Serial.available());
        Serial.println(" invalid serial bytes");

        while (Serial.available() > 0)
            Serial.read();
        break;
    }
}

void drawRoutes(uint32_t time)
{
    // Iterate every led
    for (int i = 0; i < LED_COUNT; i++)
    {
        uint8_t currentColorCount = 0;
        memset(routeColors, 0, MAX_LINES * sizeof(CRGB));
        int8_t direction = 0;

        // Check if there are any lines which overlay this led, if so, save its color in currentColors
        for (uint8_t j = 0; j < MAX_LINES; j++)
        {
            if (routes[j] && ((routes[j]->startLed <= i && routes[j]->endLed >= i) ||
                              (routes[j]->startLed >= i && routes[j]->endLed <= i)))
            {
                routeColors[currentColorCount] = routes[j]->color;
                currentColorCount++;

                if (routes[j]->startLed < routes[j]->endLed)
                {
                    direction--;
                }
                else if (routes[j]->startLed > routes[j]->endLed)
                {
                    direction++;
                }
            }
        }

        if (currentColorCount == 0)
        {
            leds[i] = CRGB(0, 0, 0);
            continue;
        }
        else if (currentColorCount == 1)
        {
            // Add black if only one color so the direction is still shown
            routeColors[currentColorCount] = CRGB(0, 0, 0);
            currentColorCount++;
        }

        int colorIndex;
        if (direction == 0)
        {
            colorIndex = i % currentColorCount;
        }
        else if (direction > 0)
        {
            colorIndex = ((i + time / ROUTE_SHIFT_INTERVAL) / ROUTE_SPLIT_SIZE) % currentColorCount;
        }
        else // direction < 0
        {
            colorIndex = ((i - time / ROUTE_SHIFT_INTERVAL) / ROUTE_SPLIT_SIZE) % currentColorCount;
        }

        // Update led color by blending it with the new color
        leds[i] = blend(leds[i], routeColors[colorIndex], ROUTE_BLEND_FACTOR);
    }
}

void drawEffect(uint32_t time)
{
    // Set timer int variable which is located at 8
    *(uint32_t *)(mem + 8) = (uint32_t)time;

    // Execute program for every led on the strip
    lastExitCode = 0;
    for (int i = effectInterlacing; i < LED_COUNT; i += INTERLACE_LEVEL)
    {
        // Set index int variable which is located at 4
        *(uint32_t *)(mem + 4) = i;
        // Set red byte variable which is located at 0
        mem[0] = leds[i].r;
        // Set green byte variable which is located at 1
        mem[1] = leds[i].g;
        // Set blue byte variable which is located at 2
        mem[2] = leds[i].b;

        // Run the program in effect
        stackPointer = MAX_PROGRAM_SIZE;
        exePointer = effectEntryPoint;
        lastExitCode = run();
        if (lastExitCode)
            break;

        // Update led color with result of program
        leds[i] = CRGB(mem[0], mem[1], mem[2]);
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
            delete le;
            routes[i] = nullptr;
            continue;
        }

        anyRoute = true;
    }

    if (anyRoute)
    {
        drawRoutes(time);
    }
    else
    {
        drawEffect(time);
    }

    FastLED.show();

    fpsCounter++;
    if (time - lastShownInfoTime >= 1000)
    {
        // Show frames per second
        Serial.print("FPS: ");
        Serial.println(fpsCounter);

        // Show instructions per second
        Serial.print("IPS: ");
        Serial.println(executed);

        // Only show exit code if non-zero (error occured)
        if (lastExitCode)
        {
            Serial.print("Error exit code: ");
            Serial.println(lastExitCode);
        }

        lastShownInfoTime = time;
        fpsCounter = 0;
        executed = 0;
    }
}
