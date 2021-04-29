#include "../leds.h"

uint64_t counter2 = 0;

void loop()
{
    for (int i = 0; i < LED_COUNT; i++)
    {
        leds[i] = CHSV(((counter2 / 8) + i) % 255, 255, 255);
    }

    counter2++;
}