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

uint32_t executed;

enum OpCode
{
    Noop = 0x00,
    Push = 0x01,
    Pop = 0x02,
    PushConst8 = 0x03,
    PushConst16 = 0x04,
    PushConst32 = 0x05,
    Dup = 0x06,
    Swap = 0x07,
    Pop8 = 0x08,
    Push8 = 0x09,
    Halt = 0x0F,

    Add = 0x10,
    Sub = 0x11,
    Mul = 0x12,
    Div = 0x13,
    Mod = 0x14,
    Inv = 0x15,
    Abs = 0x16,
    Add8 = 0x17,

    Jrnz = 0x20,
    Jrz = 0x21,
    Jr = 0x22,
    Call = 0x23,

    Eq = 0x30,
    Neq = 0x31,
    Lt = 0x32,
    Bt = 0x33,
    Lte = 0x34,
    Bte = 0x35,

    Out = 0xA0,
};

// optimizations:
// - push <addr:2> -> pushb <addr:1>
// - pop <addr:2> -> popb <addr:1>
// - instructions like add8

void (*callHandler)(unsigned char);

int run(unsigned char *mem, unsigned short exePointer, unsigned short stackPointer)
{
    while (1)
    {
        executed++;
        switch (mem[exePointer++])
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
        case PushConst8:
        {
            int val = mem[exePointer++];
            stackPointer -= sizeof(INT);
            // mem[stackPointer] = val;
            *(INT *)(mem + stackPointer) = val;
#ifdef DEBUG
            printf("pushconst8 %d\n", val);
#endif
            continue;
        }
        case PushConst16:
        {
            int val = mem[exePointer++] | (mem[exePointer++] << 8);
            stackPointer -= sizeof(INT);
            *(INT *)(mem + stackPointer) = val;
#ifdef DEBUG
            printf("pushconst16 %d\n", val);
#endif
            continue;
        }
        case PushConst32:
        {
            int val = mem[exePointer++] | (mem[exePointer++] << 8) | (mem[exePointer++] << 16) | (mem[exePointer++] << 24);
            exePointer += 4;
            stackPointer -= sizeof(INT);
            *(INT *)(mem + stackPointer) = val;
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
        case Pop8:
        {
            unsigned short addr = mem[exePointer++] | (mem[exePointer++] << 8);
            mem[addr] = mem[stackPointer];
#ifdef DEBUG
            printf("pop8 %d\n", addr);
#endif
            stackPointer += sizeof(INT);
            continue;
        }
        case Push8:
        {
            unsigned short addr = mem[exePointer++] | (mem[exePointer++] << 8);
            stackPointer -= sizeof(INT);
            // mem[stackPointer] = mem[addr];
            *(INT *)(mem + stackPointer) = mem[addr];
#ifdef DEBUG
            printf("push8 %d\n", addr);
#endif
            continue;
        }
        case 0x0A:
        case 0x0B:
        case 0x0C:
        case 0x0E:
            return EINVOP;

        case Halt:
#ifdef DEBUG
            printf("halt (stackPointer at %x)\n", stackPointer);
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
            *(INT *)(mem + stackPointer) = -(*(INT *)(mem + stackPointer));
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
        case Add8:
        {
            char val = mem[exePointer++];
            *(INT *)(mem + stackPointer) += val;
#ifdef DEBUG
            printf("add8 %d\n", val);
#endif
            continue;
        }
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

        case Call:
        {
            unsigned char id = mem[exePointer++];
            callHandler(mem[id]);
#ifdef DEBUG
            printf("call %d\n", id);
#endif
            continue;
        }

        case 0x24:
        case 0x25:
        case 0x26:
        case 0x27:
        case 0x28:
        case 0x29:
        case 0x2A:
        case 0x2B:
        case 0x2C:
        case 0x2D:
        case 0x2E:
        case 0x2F:
            return EINVOP;

        case Eq:
            *(INT *)(mem + stackPointer + sizeof(INT)) = *(INT *)(mem + stackPointer + sizeof(INT)) == *(INT *)(mem + stackPointer);
            stackPointer += sizeof(INT);
#ifdef DEBUG
            printf("eq\n");
#endif
            continue;
        case Neq:
            *(INT *)(mem + stackPointer + sizeof(INT)) = *(INT *)(mem + stackPointer + sizeof(INT)) != *(INT *)(mem + stackPointer);
            stackPointer += sizeof(INT);
#ifdef DEBUG
            printf("neq\n");
#endif
            continue;
        case Lt:
            *(INT *)(mem + stackPointer + sizeof(INT)) = *(INT *)(mem + stackPointer + sizeof(INT)) < *(INT *)(mem + stackPointer);
            stackPointer += sizeof(INT);
#ifdef DEBUG
            printf("lt\n");
#endif
            continue;
        case Bt:
            *(INT *)(mem + stackPointer + sizeof(INT)) = *(INT *)(mem + stackPointer + sizeof(INT)) > *(INT *)(mem + stackPointer);
            stackPointer += sizeof(INT);
#ifdef DEBUG
            printf("bt\n");
#endif
            continue;
        case Lte:
            *(INT *)(mem + stackPointer + sizeof(INT)) = *(INT *)(mem + stackPointer + sizeof(INT)) <= *(INT *)(mem + stackPointer);
            stackPointer += sizeof(INT);
#ifdef DEBUG
            printf("lte\n");
#endif
            continue;
        case Bte:
            *(INT *)(mem + stackPointer + sizeof(INT)) = *(INT *)(mem + stackPointer + sizeof(INT)) >= *(INT *)(mem + stackPointer);
            stackPointer += sizeof(INT);
#ifdef DEBUG
            printf("bte\n");
#endif
            continue;

        case Out:
#if ARDUINO
            PRINTLN(*(INT *)(mem + stackPointer));
#endif
#ifdef DEBUG
            printf("out %d\n", *(INT *)(mem + stackPointer));
#endif
            stackPointer += sizeof(INT);
            continue;

        default:
            // PRINTLN("invalid opcode");
            // PRINTLN(mem[exePointer - 1]);
#ifdef DEBUG
            printf("unknown opcode %d\n", mem[exePointer - 1]);
#endif
            return EINVOP;
        }
    }
    return 0;
}
