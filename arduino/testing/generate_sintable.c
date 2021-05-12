#include <stdio.h>
#include <math.h>
#include <stdint.h>
int sintable[256] = {0};

int main()
{
    for (int i = 0; i < 256; i++)
    {
        float f = (i / 128.0);
        uint8_t s = (uint8_t)(sin(f * 3.14) * 128 + 128);
        printf("%d, ", s);
    }

    printf("\n");

    return 0;
}