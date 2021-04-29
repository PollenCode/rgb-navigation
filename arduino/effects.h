//
// THIS FILE IS GENERATED USING arduino-client, DO NOT TOUCH IT!!
//

#pragma once

#define loop effect_0
#include "effects/black.h"
#undef loop

#define loop effect_1
#include "effects/rainbow.h"
#undef loop

void setupEffect(unsigned char num)
{
    // do not remove
}

void playEffect(unsigned char num)
{
    switch (num)
    {
    case 1:
        effect_1();
        return;

    default:
        effect_0();
        return;
    }
}

#define DEFAULT_EFFECT 1