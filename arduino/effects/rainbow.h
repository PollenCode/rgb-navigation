#include "../leds.h"

void loop()
{
    for (int i = 0; i < LED_COUNT; i++)
    {
        leds[i] = CHSV(((counter / 8) + i) % 255, 255, 255);
    }
}