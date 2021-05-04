#include <string.h>
#include <stdio.h>
#include <stdlib.h>

enum OpCode
{
    Noop = 0x00,
    Push = 0x01,
    Pop = 0x02,
    Push8 = 0x03,
    Push16 = 0x04,
    Push32 = 0x05,
    PopVoid = 0x06,
    Swap = 0x07,
    Add = 0x10,
    Sub = 0x11,
    Mul = 0x12,
    Div = 0x13,
    Mod = 0x14,
    Inv = 0x15,
    Abs = 0x16,
};

int main()
{
    FILE *fd = fopen("input.hex", "rb");
    if (!fd)
    {
        printf("could not open file\n");
        return -1;
    }

    fseek(fd, 0, SEEK_END);
    int size = ftell(fd);
    fseek(fd, 0, SEEK_SET);

    printf("file size %d\n", size);

    unsigned char *mem = (unsigned char *)malloc(65536);
    memset(mem, 65536, 0);
    int *stack = (int *)mem;
    unsigned short stackPointer = 65535;
    unsigned char *buffer = (unsigned char *)malloc(size);

    for (int i = 0; i < size; i++)
    {
        buffer[i] = fgetc(fd);
    }

    fclose(fd);

    printf("interpreting\n");
    printf("stackPointer %d\n", stackPointer);

    for (int i = 0; i < size;)
    {
        unsigned char op = buffer[i++];
        switch (op)
        {
        case Noop:
            break;
        case Push:
        {
            unsigned short addr = buffer[i++] | (buffer[i++] << 8);
            stackPointer -= 4;
            *(int *)(mem + stackPointer) = *(int *)(mem + addr);
            if (stackPointer < 1000)
            {
                printf("stackoverflow\n");
                return -1;
            }
            printf("push %d\n", addr);
            break;
        }
        case Pop:
        {
            unsigned short addr = buffer[i++] | (buffer[i++] << 8);
            *(int *)(mem + addr) = *(int *)(mem + stackPointer);
            printf("pop %d = %d\n", addr, *(int *)(mem + stackPointer));
            stackPointer += 4;
            break;
        }
        case PopVoid:
            printf("popvoid\n");
            break;
        case Push8:
        {
            char val = buffer[i++];
            stackPointer -= 4;
            *(char *)(mem + stackPointer) = val;
            printf("pushconst8 %d\n", val);
            break;
        }
        case Push16:
        {
            short val = buffer[i++] | (buffer[i++] << 8);
            stackPointer -= 4;
            *(short *)(mem + stackPointer) = val;
            printf("pushconst16 %d\n", val);
            break;
        }
        case Push32:
        {
            int val = buffer[i++] | (buffer[i++] << 8) | (buffer[i++] << 16) | (buffer[i++] << 24);
            stackPointer -= 4;
            *(int *)(mem + stackPointer) = val;
            printf("pushconst32 %d\n", val);
            break;
        }
        case Swap:
            printf("swap\n");
            break;
        case Add:
            printf("add %d + %d\n", *(int *)(mem + stackPointer + 4), *(int *)(mem + stackPointer));
            *(int *)(mem + stackPointer + 4) = *(int *)(mem + stackPointer + 4) + *(int *)(mem + stackPointer);
            stackPointer += 4;
            break;
        case Sub:
            *(int *)(mem + stackPointer + 4) = *(int *)(mem + stackPointer + 4) - *(int *)(mem + stackPointer);
            stackPointer += 4;
            printf("sub\n");
            break;
        case Mul:
            *(int *)(mem + stackPointer + 4) = *(int *)(mem + stackPointer + 4) * *(int *)(mem + stackPointer);
            stackPointer += 4;
            printf("mul\n");
            break;
        case Div:
            *(int *)(mem + stackPointer + 4) = *(int *)(mem + stackPointer + 4) / *(int *)(mem + stackPointer);
            stackPointer += 4;
            printf("div\n");
            break;
        case Mod:
            *(int *)(mem + stackPointer + 4) = *(int *)(mem + stackPointer + 4) % *(int *)(mem + stackPointer);
            stackPointer += 4;
            printf("mod\n");
            break;
        case Inv:
            *(int *)(mem + stackPointer) = -(*(int *)(mem + stackPointer + 4));
            printf("inv\n");
            break;
        case Abs:
        {
            int val = *(int *)(mem + stackPointer);
            *(int *)(mem + stackPointer) = val < 0 ? -val : val;
            printf("abs\n");
            break;
        }

        default:
            printf("unknown opcode %d\n", op);
            break;
        }
    }

    for (int i = 0; i < 40; i += 4)
    {
        printf("value at %x: %d\n", i, *(int *)(mem + i));
    }
    for (int i = 65535 - 16; i < 65535; i += 4)
    {
        printf("value at %x: %d\n", i, *(int *)(mem + i));
    }
}