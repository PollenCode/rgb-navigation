// #define DEBUG

#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#define DEBUG
#include "../arduino/interpreter.c"

int main()
{
    FILE *fd = fopen("input.hex", "rb");
    if (!fd)
    {
        printf("could not open file\n");
        return -1;
    }

    fseek(fd, 0, SEEK_END);
    int codeSize = ftell(fd);
    fseek(fd, 0, SEEK_SET);

    unsigned char *mem = (unsigned char *)malloc(65536);
    memset(mem, 65536, 0);

    for (int i = 0; i < codeSize; i++)
    {
        mem[i] = fgetc(fd);
    }

    fclose(fd);

    struct timespec tstart = {0, 0}, tend = {0, 0};
    clock_gettime(CLOCK_MONOTONIC, &tstart);

    int res;
    for (int i = 0; i < 1; i++)
    {
        mem[0] = i;
        res = run(mem, codeSize, 20);
    }

    clock_gettime(CLOCK_MONOTONIC, &tend);
    printf("done, took about %.5f seconds\n",
           ((double)tend.tv_sec + 1.0e-9 * tend.tv_nsec) -
               ((double)tstart.tv_sec + 1.0e-9 * tstart.tv_nsec));

    if (res)
        printf("program exited with non-zero exit code %d\n", res);

    printf("---- relevant memory ----\n");

    for (int i = 0; i < 40; i += 4)
    {
        printf("value at %x: %d\n", i, *(int *)(mem + i));
    }
    for (int i = 65535 - 16; i < 65535; i += 4)
    {
        printf("value at %x: %d\n", i, *(int *)(mem + i));
    }
}