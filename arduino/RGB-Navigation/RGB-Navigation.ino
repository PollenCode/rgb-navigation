#include "FastLED.h"

// Pride2015
// Animated, ever-changing rainbows.
// by Mark Kriegsman

#if FASTLED_VERSION < 3001000
#error "Requires FastLED 3.1 or later; check github for latest code."
#endif

#define POTENTIO    A0
//#define DATA_PIN    3
#define DATA_PIN    5
//#define CLK_PIN   4
#define LED_TYPE    WS2811
#define COLOR_ORDER RGB
//#define NUM_LEDS    50
#define NUM_LEDS    784
#define BRIGHTNESS  255

int val;

CRGB leds[NUM_LEDS];


void setup() {
  delay(3000); // 3 second delay for recovery

  Serial.begin(9600);
  
  // tell FastLED about the LED strip configuration
  FastLED.addLeds<LED_TYPE,DATA_PIN,COLOR_ORDER>(leds, NUM_LEDS)
    .setCorrection(TypicalLEDStrip)
    .setDither(BRIGHTNESS < 255);

  // set master brightness control
  FastLED.setBrightness(BRIGHTNESS);
}


void loop()
{
  
  val = analogRead(POTENTIO);
  //val = val / 20.48;
  val = val / 1.31;
  Serial.println(val);
  leds[val] = CRGB::Red;
  leds[val + 1] = CRGB::Red;
  leds[val + 2] = CRGB::Red;
  leds[val + 3] = CRGB::Red;
  FastLED.show();  
  delay(10);
  leds[val] = CRGB::Black;
  leds[val + 1] = CRGB::Black;
  leds[val + 2] = CRGB::Black;
  leds[val + 3] = CRGB::Black;
  FastLED.show(); 
}
