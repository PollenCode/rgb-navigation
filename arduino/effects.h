//
// THIS FILE IS GENERATED, DO NOT TOUCH IT
//

#pragma once

#define effect effect_0
#include "effects/black.h"
#undef effect

#define effect effect_1
#include "effects/rainbow.h"
#undef effect

void playEffect(unsigned char num)
{
    switch (num)
    {
    case 0:
        effect_1();
        return;

    default:
        effect_0();
        return;
    }
}
