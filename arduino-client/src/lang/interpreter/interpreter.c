#include <stdint.h>

#ifdef ARDUINO
#define PUTCHAR Serial.write
#define INT uint32_t
#else
#include <stdio.h>
#define PUTCHAR putchar
#define INT uint32_t
#endif

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
    Halt = 0x0F,
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
        case Halt:
#ifdef DEBUG
            printf("halt\n");
#endif
            return 0;
        case Push:
        {
            unsigned short addr = mem[exePointer++] | (mem[exePointer++] << 8);
            stackPointer -= sizeof(INT);
            *(INT *)(mem + stackPointer) = *(INT *)(mem + addr);
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
            *(INT *)(mem + addr) = *(INT *)(mem + stackPointer);
#ifdef DEBUG
            printf("pop %d\n", addr);
#endif
            stackPointer += sizeof(INT);
            break;
        }
        case Dup:
        {
            stackPointer -= sizeof(INT);
            *(INT *)(mem + stackPointer) = *(INT *)(mem + stackPointer + sizeof(INT));
#ifdef DEBUG
            printf("dup\n");
#endif
            break;
        }
        case Push8:
        {
            char val = mem[exePointer++];
            stackPointer -= sizeof(INT);
            *(char *)(mem + stackPointer) = val;
#ifdef DEBUG
            printf("pushconst8 %d\n", val);
#endif
            break;
        }
        case Push16:
        {
            short val = mem[exePointer++] | (mem[exePointer++] << 8);
            stackPointer -= sizeof(INT);
            *(short *)(mem + stackPointer) = val;
#ifdef DEBUG
            printf("pushconst16 %d\n", val);
#endif
            break;
        }
        case Push32:
        {
            int val = mem[exePointer++] | (mem[exePointer++] << 8) | (mem[exePointer++] << 16) | (mem[exePointer++] << 24);
            stackPointer -= sizeof(INT);
            *(int *)(mem + stackPointer) = val;
#ifdef DEBUG
            printf("pushconst32 %d\n", val);
#endif
            break;
        }
        case Swap:
        {
            INT temp = *(INT *)(mem + stackPointer + sizeof(INT));
            *(INT *)(mem + stackPointer + sizeof(INT)) = *(INT *)(mem + stackPointer);
            *(INT *)(mem + stackPointer) = temp;
#ifdef DEBUG
            printf("swap\n");
#endif
            break;
        }
        case Add:
            *(INT *)(mem + stackPointer + sizeof(INT)) = *(INT *)(mem + stackPointer + sizeof(INT)) + *(INT *)(mem + stackPointer);
            stackPointer += sizeof(INT);
#ifdef DEBUG
            printf("add\n");
#endif
            break;
        case Sub:
            *(INT *)(mem + stackPointer + sizeof(INT)) = *(INT *)(mem + stackPointer + sizeof(INT)) - *(INT *)(mem + stackPointer);
            stackPointer += sizeof(INT);
#ifdef DEBUG
            printf("sub\n");
#endif
            break;
        case Mul:
            *(INT *)(mem + stackPointer + sizeof(INT)) = *(INT *)(mem + stackPointer + sizeof(INT)) * *(INT *)(mem + stackPointer);
            stackPointer += sizeof(INT);
#ifdef DEBUG
            printf("mul\n");
#endif
            break;
        case Div:
            *(INT *)(mem + stackPointer + sizeof(INT)) = *(INT *)(mem + stackPointer + sizeof(INT)) / *(INT *)(mem + stackPointer);
            stackPointer += sizeof(INT);
#ifdef DEBUG
            printf("div\n");
#endif
            break;
        case Mod:
            *(INT *)(mem + stackPointer + sizeof(INT)) = *(INT *)(mem + stackPointer + sizeof(INT)) % *(INT *)(mem + stackPointer);
            stackPointer += sizeof(INT);
#ifdef DEBUG
            printf("mod\n");
#endif
            break;
        case Inv:
            *(INT *)(mem + stackPointer) = -(*(INT *)(mem + stackPointer + sizeof(INT)));
#ifdef DEBUG
            printf("inv\n");
#endif
            break;
        case Abs:
        {
            INT val = *(INT *)(mem + stackPointer);
            *(INT *)(mem + stackPointer) = val < 0 ? -val : val;
#ifdef DEBUG
            printf("abs\n");
#endif
            break;
        }
        case Out:
            PUTCHAR(mem[stackPointer++]);
            break;

        default:
#ifdef DEBUG
            printf("unknown opcode %d\n", op);
#endif
            return -2;
        }
    }
    return 0;
}
