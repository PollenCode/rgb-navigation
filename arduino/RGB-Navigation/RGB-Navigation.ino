#define MAX_LINES 32

struct Color
{
    uint8_t r, g, b;

    Color(uint8_t r, uint8_t g, uint8_t b) : r(r), g(g), b(b) {}
};

struct LineEffect
{
    uint16_t startLed;
    uint16_t endLed;
    Color color;

    LineEffect(uint16_t startLed, uint16_t endLed, Color color) : startLed(startLed), endLed(endLed), color(color) {}
};

LineEffect *lines[MAX_LINES];
uint64_t counter = 0;

void setup()
{
    Serial.begin(115200);
    Serial.println("Starting...");
    delay(100);

    pinMode(LED_BUILTIN, OUTPUT);
    memset(lines, 0, sizeof(LineEffect *) * MAX_LINES);

    for (int i = 0; i < 5; i++)
    {
        digitalWrite(LED_BUILTIN, true);
        delay(100);
        digitalWrite(LED_BUILTIN, false);
        delay(100);
    }

    Serial.println("Ready");
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
            Serial.print("Received packet of type ");
            Serial.println(packetType);

            if (packetType == 1)
            {
                // Effect
                uint8_t effectType = Serial.read();
                Serial.print("Unimplemented effectType ");
                Serial.println(effectType);
            }
            else if (packetType == 2 || packetType == 3)
            {
                uint8_t id = Serial.read();
                // if (id >= MAX_LINES)
                // {
                //     Serial.println("Reached max lines");
                //     break;
                // }

                if (packetType == 2)
                {
                    if (lines[id] != nullptr)
                        delete lines[id];

                    // Enable line effect
                    uint8_t r = Serial.read(), g = Serial.read(), b = Serial.read();
                    int start = Serial.read() << 8 | Serial.read();
                    int end = Serial.read() << 8 | Serial.read();
                    lines[id] = new LineEffect(start, end, Color(r, g, b));

                    Serial.print("Enable line ");
                    Serial.println(id);
                }
                else
                {
                    // Disable line effect
                    if (lines[id] != nullptr)
                    {
                        delete lines[id];
                        lines[id] = nullptr;
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
    }

    for (int i = 0; i < MAX_LINES; i++)
    {
        LineEffect *le = lines[i];
        if (!le)
            continue;

        digitalWrite(LED_BUILTIN, counter % 1000 < 50);
    }

    counter++;
}
