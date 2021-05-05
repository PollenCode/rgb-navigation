#include <FastLED.h>
#include "interpreter.c"

#define LED_COUNT 50
#define DATA_PIN D4
// Max amount of routes that can be drawn at once
#define MAX_LINES 32
// Every x other pixel is rendered in the next frame
#define INTERLACE_LEVEL 2
#define MAX_PROGRAM_SIZE 2000

// A route
struct LineEffect
{
    uint16_t startLed;
    uint16_t endLed;
    uint64_t endTime;
    CRGB color;

    LineEffect(uint16_t startLed, uint16_t endLed, uint64_t endTime, CRGB color) : startLed(startLed), endLed(endLed), endTime(endTime), color(color) {}
};

unsigned char idleEffect = 0;
LineEffect *routes[MAX_LINES];
CRGB leds[LED_COUNT];
uint32_t counter = 0;
uint16_t fpsCounter = 0;
uint64_t lastShown = 0;

int interlacing = 0;
unsigned short entryPoint = 16;
unsigned char mem[MAX_PROGRAM_SIZE] = {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x04, 0x00, 0x01, 0x08, 0x00, 0x03, 0x64, 0x13, 0x10, 0x03, 0x20, 0x14, 0x02, 0x0c, 0x00, 0x01, 0x0c, 0x00, 0x03, 0x10, 0x33, 0x21, 0x08, 0x03, 0x20, 0x01, 0x0c, 0x00, 0x11, 0x22, 0x03, 0x01, 0x0c, 0x00, 0x02, 0x0c, 0x00, 0x01, 0x0c, 0x00, 0x03, 0x08, 0x12, 0x08, 0x00, 0x00, 0x04, 0xff, 0x00, 0x01, 0x0c, 0x00, 0x03, 0x08, 0x12, 0x11, 0x08, 0x01, 0x00, 0x01, 0x04, 0x00, 0x01, 0x08, 0x00, 0x10, 0x04, 0xff, 0x00, 0x14, 0x03, 0x00, 0x30, 0x21, 0x05, 0x04, 0xff, 0x00, 0x22, 0x02, 0x03, 0x00, 0x08, 0x02, 0x00, 0x0f};

void setColorLine(int start, int end, CRGB color);

void handler(unsigned char id)
{
    switch (id)
    {
    }
}

void setup()
{
    callHandler = handler;

    // Increasing the baud rate will cause corruption and inconsistency
    Serial.begin(19200);
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

void processPacket()
{
    int packetType = Serial.read();
    // Switch does not work for some reason??
    if (packetType == 1) // Set effect
    {
        idleEffect = Serial.read();
        Serial.print("Set idle effect ");
        Serial.println(idleEffect);
        // setupEffect(idleEffect);
    }
    else if (packetType == 2 || packetType == 3) // Enable/disable line
    {
        uint8_t id = Serial.read();
        if (id >= MAX_LINES)
        {
            Serial.println("Reached max lines");
            return;
        }

        if (packetType == 2)
        {
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
        else
        {
            // Disable line effect
            if (routes[id] != nullptr)
            {
                setColorLine(routes[id]->startLed, routes[id]->endLed, CRGB(0, 0, 0));
                delete routes[id];
                routes[id] = nullptr;
            }

            Serial.print("Disable line ");
            Serial.println(id);
        }
    }
    else if (packetType == 4)
    {
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

        uint8_t room = Serial.read();
        uint64_t endTime = millis() + 5 * 1000;

        switch (room)
        {
        case 0:
            routes[id] = new LineEffect(0, 5, endTime, CRGB(255, 0, 0));
            Serial.print("Room 1");
            break;
        case 1:
            routes[id] = new LineEffect(0, 10, endTime, CRGB(255, 0, 0));
            Serial.print("Room 2");
            break;
        case 2:
            routes[id] = new LineEffect(0, 15, endTime, CRGB(255, 0, 0));
            Serial.print("Room 3");
            break;
        case 3:
            routes[id] = new LineEffect(0, 20, endTime, CRGB(255, 0, 0));
            Serial.print("Room 4");
            break;
        case 4:
            routes[id] = new LineEffect(0, 25, endTime, CRGB(255, 0, 0));
            Serial.print("Room 5");
            break;
        case 5:
            routes[id] = new LineEffect(0, 30, endTime, CRGB(255, 0, 0));
            Serial.print("Room 6");
            break;
        }
    }
    else
    {
        Serial.print("Unknown packet type ");
        Serial.println(packetType);
    }
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

void loop()
{
    // int a = Serial.available();
    // if (Serial.available() > 0)
    // {
    //     Serial.println("incoming");
    //     while (Serial.available() > 0)
    //     {
    //         Serial.print(" ");
    //         Serial.print(Serial.read());
    //     }
    // }

    uint64_t time = millis();

    int packetSize = Serial.peek();
    int available = Serial.available();

    if (packetSize > 0 && available >= packetSize)
    {
        Serial.read(); // Consume packetSize
        processPacket();
    }

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

        // Draw line effect
        int dir = le->endLed > le->startLed ? 1 : -1;
        for (int i = le->startLed, j = 0; i != le->endLed && i < LED_COUNT && i >= 0; i += dir, j++)
        {
            if ((counter / 10 + j) % 20 == 0)
            {
                leds[i] = CRGB(0, 0, 0);
            }
            else
            {
                leds[i] = CRGB(le->color.r, le->color.g, le->color.b);
            }
        }
    }

    // for (int i = 0; i < LED_COUNT; i++)
    // {
    //     leds[i] = CRGB(255, 0, 0);
    // }

    if (!anyRoute)
    {
        *(INT *)(mem + 8) = time & 0x7FFF;
        for (int i = interlacing; i < LED_COUNT; i += INTERLACE_LEVEL)
        {
            *(INT *)(mem + 4) = i;
            run(mem, entryPoint, MAX_PROGRAM_SIZE);
            leds[i] = CRGB(mem[0], mem[1], mem[2]);
        }
        interlacing++;
        if (interlacing >= INTERLACE_LEVEL)
            interlacing = 0;
    }

    fpsCounter++;
    if (time - lastShown >= 1000)
    {
        Serial.print("FPS: ");
        Serial.println(fpsCounter);
        // Serial.print((int32_t)(executed & 0xFFFFFFFF));
        // Serial.println((int32_t)(executed >> 32) & 0xFFFFFFFF);
        lastShown = time;
        fpsCounter = 0;
    }

    FastLED.show();
    counter++;
}
