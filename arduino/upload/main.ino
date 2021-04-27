

void setup()
{
    Serial.begin(9600);
    pinMode(LED_BUILTIN, OUTPUT);
}

void test()
{
    Serial.println("in ram func");
}

void loop()
{

    Serial.print("loop fn: ");
    Serial.println((int)&loop, HEX);
    Serial.print("test fn: ");
    Serial.println((int)&test, HEX);
    digitalWrite(LED_BUILTIN, false);
    delay(1000);
    digitalWrite(LED_BUILTIN, true);
    delay(1000);
    Serial.println("this is atest");
    test();
}