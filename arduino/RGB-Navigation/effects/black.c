#include "../leds.h"

void blackEffect()
{
    for (int i = 0; i < LED_COUNT; i++)
    {
        leds[i] = CRGB(20, 20, 20);
    }
}