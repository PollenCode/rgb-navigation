#include <stdint.h>

#ifdef ARDUINO
#define INT int
#else
#include <stdio.h>
#define PUTCHAR putchar
#define INT uint32_t
#endif

#define EINVOP -2
#define EOVERFLOW -1

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
    Jrnz = 0x20,
    Jrz = 0x21,
    Jr = 0x22,
    Out = 0xA0,
};

int run(unsigned char *mem, unsigned int size, unsigned short exePointer)
{
    unsigned short stackPointer = 700;

    while (1)
    {
        unsigned char op = mem[exePointer++];
        switch (op)
        {
        case Noop:
            continue;
        case Push:
        {
            unsigned short addr = mem[exePointer++] | (mem[exePointer++] << 8);
            stackPointer -= sizeof(INT);
            *(INT *)(mem + stackPointer) = *(INT *)(mem + addr);
#ifdef DEBUG
            printf("push %d\n", addr);
#endif
            continue;
        }
        case Pop:
        {
            unsigned short addr = mem[exePointer++] | (mem[exePointer++] << 8);
            *(INT *)(mem + addr) = *(INT *)(mem + stackPointer);
#ifdef DEBUG
            printf("pop %d\n", addr);
#endif
            stackPointer += sizeof(INT);
            continue;
        }
        case Push8:
        {
            char val = mem[exePointer++];
            stackPointer -= sizeof(INT);
            *(char *)(mem + stackPointer) = val;
#ifdef DEBUG
            printf("pushconst8 %d\n", val);
#endif
            continue;
        }
        case Push16:
        {
            short val = mem[exePointer++] | (mem[exePointer++] << 8);
            stackPointer -= sizeof(INT);
            *(short *)(mem + stackPointer) = val;
#ifdef DEBUG
            printf("pushconst16 %d\n", val);
#endif
            continue;
        }
        case Push32:
        {
            int val = mem[exePointer++] | (mem[exePointer++] << 8) | (mem[exePointer++] << 16) | (mem[exePointer++] << 24);
            stackPointer -= sizeof(INT);
            *(int *)(mem + stackPointer) = val;
#ifdef DEBUG
            printf("pushconst32 %d\n", val);
#endif
            continue;
        }
        case Dup:
        {
            stackPointer -= sizeof(INT);
            *(INT *)(mem + stackPointer) = *(INT *)(mem + stackPointer + sizeof(INT));
#ifdef DEBUG
            printf("dup\n");
#endif
            continue;
        }
        case Swap:
        {
            INT temp = *(INT *)(mem + stackPointer + sizeof(INT));
            *(INT *)(mem + stackPointer + sizeof(INT)) = *(INT *)(mem + stackPointer);
            *(INT *)(mem + stackPointer) = temp;
#ifdef DEBUG
            printf("swap\n");
#endif
            continue;
        }
        case 0x08:
        case 0x09:
        case 0x0A:
        case 0x0B:
        case 0x0C:
        case 0x0E:
            return EINVOP;

        case Halt:
#ifdef DEBUG
            printf("halt\n");
#endif
            return 0;
        case Add:
            *(INT *)(mem + stackPointer + sizeof(INT)) = *(INT *)(mem + stackPointer + sizeof(INT)) + *(INT *)(mem + stackPointer);
            stackPointer += sizeof(INT);
#ifdef DEBUG
            printf("add\n");
#endif
            continue;
        case Sub:
            *(INT *)(mem + stackPointer + sizeof(INT)) = *(INT *)(mem + stackPointer + sizeof(INT)) - *(INT *)(mem + stackPointer);
            stackPointer += sizeof(INT);
#ifdef DEBUG
            printf("sub\n");
#endif
            continue;
        case Mul:
            *(INT *)(mem + stackPointer + sizeof(INT)) = *(INT *)(mem + stackPointer + sizeof(INT)) * *(INT *)(mem + stackPointer);
            stackPointer += sizeof(INT);
#ifdef DEBUG
            printf("mul\n");
#endif
            continue;
        case Div:
            *(INT *)(mem + stackPointer + sizeof(INT)) = *(INT *)(mem + stackPointer + sizeof(INT)) / *(INT *)(mem + stackPointer);
            stackPointer += sizeof(INT);
#ifdef DEBUG
            printf("div\n");
#endif
            continue;
        case Mod:
            *(INT *)(mem + stackPointer + sizeof(INT)) = *(INT *)(mem + stackPointer + sizeof(INT)) % *(INT *)(mem + stackPointer);
            stackPointer += sizeof(INT);
#ifdef DEBUG
            printf("mod\n");
#endif
            continue;
        case Inv:
            *(INT *)(mem + stackPointer) = -(*(INT *)(mem + stackPointer + sizeof(INT)));
#ifdef DEBUG
            printf("inv\n");
#endif
            continue;
        case Abs:
        {
            INT val = *(INT *)(mem + stackPointer);
            *(INT *)(mem + stackPointer) = val < 0 ? -val : val;
#ifdef DEBUG
            printf("abs\n");
#endif
            continue;
        }

        case 0x17:
        case 0x18:
        case 0x19:
        case 0x1A:
        case 0x1B:
        case 0x1C:
        case 0x1D:
        case 0x1E:
        case 0x1F:
            return EINVOP;

        case Jrnz:
        {
            unsigned char rel = mem[exePointer++];
#ifdef DEBUG
            printf("jrnz %d\n", rel);
#endif
            if (*(INT *)(mem + stackPointer))
            {
                exePointer += rel;
            }
            stackPointer += sizeof(INT);
            continue;
        }

        case Jrz:
        {
            unsigned char rel = mem[exePointer++];
#ifdef DEBUG
            printf("jrz %d\n", rel);
#endif
            if (!*(INT *)(mem + stackPointer))
            {
                exePointer += rel;
            }
            stackPointer += sizeof(INT);
            continue;
        }
        case Jr:
        {
            unsigned char rel = mem[exePointer++];
#ifdef DEBUG
            printf("jr %d\n", rel);
#endif
            exePointer += rel;
            continue;
        }

            // case Out:
            //     // PRINT("out: ");
            //     // PRINTLN((int)mem[stackPointer++]);
            //     // PUTCHAR(mem[stackPointer++]);
            //     break;

        default:
#ifdef DEBUG
            printf("unknown opcode %d\n", op);
#endif
            return EINVOP;
        }
    }
    return 0;
}
