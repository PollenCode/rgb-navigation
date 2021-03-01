#include <FastLED.h>

#define MAX_LINES 32
#define LED_COUNT 32
#define DATA_PIN 3

struct Color
{
    uint8_t r, g, b;

    Color(uint8_t r, uint8_t g, uint8_t b) : r(r), g(g), b(b) {}
};

// A route
struct LineEffect
{
    uint16_t startLed;
    uint16_t endLed;
    Color color;

    LineEffect(uint16_t startLed, uint16_t endLed, Color color) : startLed(startLed), endLed(endLed), color(color) {}
};

// Effect that is used when there are no routes currently displayed
enum IdleEffect
{
    Black,
    Rainbow
};

IdleEffect idleEffect = Black;
LineEffect *routes[MAX_LINES];

CRGB leds[LED_COUNT];
uint64_t counter = 0;

void setup()
{
    Serial.begin(115200);
    Serial.println("Starting...");
    delay(100);

    pinMode(LED_BUILTIN, OUTPUT);
    memset(routes, 0, sizeof(LineEffect *) * MAX_LINES);

    FastLED.addLeds<WS2812B, DATA_PIN, RGB>(leds, LED_COUNT);
    FastLED.setBrightness(40);

    for (int i = 0; i < 5; i++)
    {
        digitalWrite(LED_BUILTIN, true);
        delay(50);
        digitalWrite(LED_BUILTIN, false);
        delay(50);
    }

    Serial.println("Ready");
}

void processPacket(int packetType)
{
    // Switch does not work for some reason??
    if (packetType == 1) // Set effect
    {
        idleEffect = (IdleEffect)Serial.read();
        Serial.print("Set idle effect ");
        Serial.println(idleEffect);
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
                delete routes[id];

            // Enable line effect
            uint8_t r = Serial.read(), g = Serial.read(), b = Serial.read();
            int start = Serial.read() << 8 | Serial.read();
            int end = Serial.read() << 8 | Serial.read();
            routes[id] = new LineEffect(start, end, Color(r, g, b));

            Serial.print("Enable line ");
            Serial.print(id);
            Serial.print(", start=");
            Serial.print(start);
            Serial.print(", end=");
            Serial.println(end);
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
    else
    {
        Serial.print("Unknown packet type ");
        Serial.println(packetType);
    }
}

void blackEffect()
{
    for (int i = 0; i < LED_COUNT; i++)
    {
        leds[i] = CRGB(20, 20, 20);
    }
}

void rainbowEffect()
{
    for (int i = 0; i < LED_COUNT; i++)
    {
        leds[i] = CHSV(((counter / 8) + i) % 255, 255, 255);
    }
}

void setColorLine(int start, int end, CRGB color)
{
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

    int available = Serial.available();
    if (available > 0)
    {
        int packetType = Serial.peek();
        if ((packetType == 2 && available >= 9) || (packetType == 1 && available >= 2) || (packetType == 3 && available >= 2))
        {
            Serial.read(); // Consume packetType
            processPacket(packetType);
        }
    }

    bool anyRoute = false;
    for (int i = 0; i < MAX_LINES; i++)
    {
        LineEffect *le = routes[i];
        if (!le)
            continue;
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

    if (!anyRoute)
    {
        // Draw idle effect
        if (idleEffect == Black)
            blackEffect();
        else if (idleEffect == Rainbow)
            rainbowEffect();
    }

    FastLED.show();

    counter++;
}
