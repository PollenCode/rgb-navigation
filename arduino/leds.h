#pragma once

#define LED_COUNT 50
#define NUM_LEDS LED_COUNT

#include <FastLED.h>

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
    uint64_t endTime;
    Color color;

    LineEffect(uint16_t startLed, uint16_t endLed, uint64_t endTime, Color color) : startLed(startLed), endLed(endLed), endTime(endTime), color(color) {}
};

CRGB leds[LED_COUNT];
