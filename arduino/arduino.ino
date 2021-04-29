#include <FastLED.h>
#include "leds.h"
#include "effects.h"

// What is effects.h? Effects.h is generated using arduino-client and contains all the possible effects.
//                    When an effect is added to the effects folder, this file can easily be regenerated without modifying the arduino.ino file.
// What is leds.h? Leds.h contains variables and functions and can be used here, and in effects

#define DATA_PIN 3
#define MAX_LINES 32

// Effect that is used when there are no routes currently displayed, see effects.h to see which effects cooresponds to a number
unsigned char idleEffect = DEFAULT_EFFECT;
LineEffect *routes[MAX_LINES];

void setColorLine(int start, int end, CRGB color);

void setup()
{
  // Increasing the baud rate will cause corruption and inconsistency
  Serial.begin(19200);
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
  setupEffect(idleEffect);
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
    setupEffect(idleEffect);
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
      routes[id] = new LineEffect(startLed, endLed, endTime, Color(r, g, b));

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
      routes[id] = new LineEffect(0, 5, endTime, Color(255, 0, 0));
      Serial.print("Room 1");
      break;
    case 1:
      routes[id] = new LineEffect(0, 10, endTime, Color(255, 0, 0));
      Serial.print("Room 2");
      break;
    case 2:
      routes[id] = new LineEffect(0, 15, endTime, Color(255, 0, 0));
      Serial.print("Room 3");
      break;
    case 3:
      routes[id] = new LineEffect(0, 20, endTime, Color(255, 0, 0));
      Serial.print("Room 4");
      break;
    case 4:
      routes[id] = new LineEffect(0, 25, endTime, Color(255, 0, 0));
      Serial.print("Room 5");
      break;
    case 5:
      routes[id] = new LineEffect(0, 30, endTime, Color(255, 0, 0));
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

  if (!anyRoute)
  {
    // Draw idle effect if no routes are being drawn
    playEffect(idleEffect);
  }

  FastLED.show();

  counter++;
}
