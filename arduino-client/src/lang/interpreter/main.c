#include <string.h>
#include <stdio.h>
#include <stdlib.h>

#undef DEBUG

enum OpCode
{
    Noop = 0x00,
    Push = 0x01,
    Pop = 0x02,
    Push8 = 0x03,
    Push16 = 0x04,
    Push32 = 0x05,
    Dup = 0x06,
    Swap = 0x07,
    Add = 0x10,
    Sub = 0x11,
    Mul = 0x12,
    Div = 0x13,
    Mod = 0x14,
    Inv = 0x15,
    Abs = 0x16,
    Out = 0xA0,
};

int run(unsigned char *mem, unsigned int size, unsigned short exePointer)
{
    unsigned short stackPointer = 65535;

    while (exePointer < size)
    {
        unsigned char op = mem[exePointer++];
        switch (op)
        {
        case Noop:
            break;
        case Push:
        {
            unsigned short addr = mem[exePointer++] | (mem[exePointer++] << 8);
            stackPointer -= 4;
            *(int *)(mem + stackPointer) = *(int *)(mem + addr);
            if (stackPointer < 1000)
            {
                printf("stackoverflow\n");
                return -1;
            }
#ifdef DEBUG
            printf("push %d\n", addr);
#endif
            break;
        }
        case Pop:
        {
            unsigned short addr = mem[exePointer++] | (mem[exePointer++] << 8);
            *(int *)(mem + addr) = *(int *)(mem + stackPointer);
#ifdef DEBUG
            printf("pop %d\n", addr);
#endif
            stackPointer += 4;
            break;
        }
        case Dup:
        {
            stackPointer -= 4;
            *(int *)(mem + stackPointer) = *(int *)(mem + stackPointer + 4);
#ifdef DEBUG
            printf("dup\n");
#endif
            break;
        }
        case Push8:
        {
            char val = mem[exePointer++];
            stackPointer -= 4;
            *(char *)(mem + stackPointer) = val;
#ifdef DEBUG
            printf("pushconst8 %d\n", val);
#endif
            break;
        }
        case Push16:
        {
            short val = mem[exePointer++] | (mem[exePointer++] << 8);
            stackPointer -= 4;
            *(short *)(mem + stackPointer) = val;
#ifdef DEBUG
            printf("pushconst16 %d\n", val);
#endif
            break;
        }
        case Push32:
        {
            int val = mem[exePointer++] | (mem[exePointer++] << 8) | (mem[exePointer++] << 16) | (mem[exePointer++] << 24);
            stackPointer -= 4;
            *(int *)(mem + stackPointer) = val;
#ifdef DEBUG
            printf("pushconst32 %d\n", val);
#endif
            break;
        }
        case Swap:
        {
            int temp = *(int *)(mem + stackPointer + 4);
            *(int *)(mem + stackPointer + 4) = *(int *)(mem + stackPointer);
            *(int *)(mem + stackPointer) = temp;
#ifdef DEBUG
            printf("swap\n");
#endif
            break;
        }
        case Add:
            *(int *)(mem + stackPointer + 4) = *(int *)(mem + stackPointer + 4) + *(int *)(mem + stackPointer);
            stackPointer += 4;
#ifdef DEBUG
            printf("add\n");
#endif
            break;
        case Sub:
            *(int *)(mem + stackPointer + 4) = *(int *)(mem + stackPointer + 4) - *(int *)(mem + stackPointer);
            stackPointer += 4;
#ifdef DEBUG
            printf("sub\n");
#endif
            break;
        case Mul:
            *(int *)(mem + stackPointer + 4) = *(int *)(mem + stackPointer + 4) * *(int *)(mem + stackPointer);
            stackPointer += 4;
#ifdef DEBUG
            printf("mul\n");
#endif
            break;
        case Div:
            *(int *)(mem + stackPointer + 4) = *(int *)(mem + stackPointer + 4) / *(int *)(mem + stackPointer);
            stackPointer += 4;
#ifdef DEBUG
            printf("div\n");
#endif
            break;
        case Mod:
            *(int *)(mem + stackPointer + 4) = *(int *)(mem + stackPointer + 4) % *(int *)(mem + stackPointer);
            stackPointer += 4;
#ifdef DEBUG
            printf("mod\n");
#endif
            break;
        case Inv:
            *(int *)(mem + stackPointer) = -(*(int *)(mem + stackPointer + 4));
#ifdef DEBUG
            printf("inv\n");
#endif
            break;
        case Abs:
        {
            int val = *(int *)(mem + stackPointer);
            *(int *)(mem + stackPointer) = val < 0 ? -val : val;
#ifdef DEBUG
            printf("abs\n");
#endif
            break;
        }
        case Out:
            putchar(mem[stackPointer++]);
            break;

        default:
            printf("unknown opcode %d\n", op);
            return -2;
        }
    }
    return 0;
}

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

    int res = run(mem, codeSize, 12);

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