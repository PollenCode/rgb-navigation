#include "interpreter.h"

uint32_t executed = 0;
uint16_t exePointer = 0;
uint16_t stackPointer = 0;
bool (*callHandler)(uint8_t);

// optimizations:
// - push <addr:2> -> pushb <addr:1>
// - pop <addr:2> -> popb <addr:1>
// - instructions like add8

int run()
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
            stackPointer -= 4;
            *(int32_t *)(mem + stackPointer) = *(int32_t *)(mem + addr);
#ifdef DEBUG
            printf("push %d\n", addr);
#endif
            continue;
        }
        case Pop:
        {
            unsigned short addr = mem[exePointer++] | (mem[exePointer++] << 8);
            *(int32_t *)(mem + addr) = *(int32_t *)(mem + stackPointer);
#ifdef DEBUG
            printf("pop %d\n", addr);
#endif
            stackPointer += 4;
            continue;
        }
        case PushConst8:
        {
            uint8_t val = mem[exePointer++];
            stackPointer -= 4;
            // mem[stackPointer] = val;
            *(int32_t *)(mem + stackPointer) = val;
#ifdef DEBUG
            printf("pushconst8 %d\n", val);
#endif
            continue;
        }
        case PushConst16:
        {
            uint16_t val = (uint16_t)mem[exePointer++] | (uint16_t)(mem[exePointer++] << 8);
            stackPointer -= 4;
            *(int32_t *)(mem + stackPointer) = val;
#ifdef DEBUG
            printf("pushconst16 %d\n", val);
#endif
            continue;
        }
        case PushConst32:
        {
            int32_t val = (int32_t)mem[exePointer++] | (int32_t)(mem[exePointer++] << 8) | (int32_t)(mem[exePointer++] << 16) | (int32_t)(mem[exePointer++] << 24);
            stackPointer -= 4;
            *(int32_t *)(mem + stackPointer) = val;
#ifdef DEBUG
            printf("pushconst32 %d\n", val);
#endif
            continue;
        }
        case Dup:
        {
            stackPointer -= 4;
            *(int32_t *)(mem + stackPointer) = *(int32_t *)(mem + stackPointer + 4);
#ifdef DEBUG
            printf("dup\n");
#endif
            continue;
        }
        case Swap:
        {
            int32_t temp = *(int32_t *)(mem + stackPointer + 4);
            *(int32_t *)(mem + stackPointer + 4) = *(int32_t *)(mem + stackPointer);
            *(int32_t *)(mem + stackPointer) = temp;
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
            stackPointer += 4;
            continue;
        }
        case Push8:
        {
            unsigned short addr = mem[exePointer++] | (mem[exePointer++] << 8);
            stackPointer -= 4;
            *(int32_t *)(mem + stackPointer) = mem[addr];
#ifdef DEBUG
            printf("push8 %d\n", addr);
#endif
            continue;
        }
        case Consume:
        {
            stackPointer += 4;
#ifdef DEBUG
            printf("consume\n");
#endif
            continue;
        }
        case 0x0B:
        case 0x0C:
        case 0x0D:
        case 0x0E:
            return EINVOP;

        case Halt:
        {
#ifdef DEBUG
            printf("halt (stackPointer at %x)\n", stackPointer);
#endif
            return 0;
        }
        case Add:
        {
            int32_t val = *(int32_t *)(mem + stackPointer);
            stackPointer += 4;
            *(int32_t *)(mem + stackPointer) += val;
#ifdef DEBUG
            printf("add\n");
#endif
            continue;
        }
        case Sub:
        {
            int32_t val = *(int32_t *)(mem + stackPointer);
            stackPointer += 4;
            *(int32_t *)(mem + stackPointer) -= val;
#ifdef DEBUG
            printf("sub\n");
#endif
            continue;
        }
        case Mul:
        {

            int32_t val = *(int32_t *)(mem + stackPointer);
            stackPointer += 4;
            *(int32_t *)(mem + stackPointer) *= val;
#ifdef DEBUG
            printf("mul\n");
#endif
            continue;
        }
        case Div:
        {

            int32_t val = *(int32_t *)(mem + stackPointer);
            stackPointer += 4;
            *(int32_t *)(mem + stackPointer) /= val;
#ifdef DEBUG
            printf("div\n");
#endif
            continue;
        }
        case Mod:
        {

            int32_t val = *(int32_t *)(mem + stackPointer);
            stackPointer += 4;
            *(int32_t *)(mem + stackPointer) %= val;
#ifdef DEBUG
            printf("mod\n");
#endif
            continue;
        }
        case Inv:
        {

            *(int32_t *)(mem + stackPointer) = -(*(int32_t *)(mem + stackPointer));
#ifdef DEBUG
            printf("inv\n");
#endif
            continue;
        }
        case Abs:
        {
            int32_t val = *(int32_t *)(mem + stackPointer);
            *(int32_t *)(mem + stackPointer) = val < 0 ? -val : val;
#ifdef DEBUG
            printf("abs\n");
#endif
            continue;
        }
        case Add8:
        {
            char val = mem[exePointer++];
            *(int32_t *)(mem + stackPointer) += val;
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
            if (*(int32_t *)(mem + stackPointer))
            {
                exePointer += rel;
            }
            stackPointer += 4;
            continue;
        }

        case Jrz:
        {
            unsigned char rel = mem[exePointer++];
#ifdef DEBUG
            printf("jrz %d\n", rel);
#endif
            if (!*(int32_t *)(mem + stackPointer))
            {
                exePointer += rel;
            }
            stackPointer += 4;
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
#ifdef DEBUG
            printf("call %d\n", id);
#endif
            if (!callHandler(id))
                return EINVCALL;
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
        {
            int32_t val = *(int32_t *)(mem + stackPointer);
            stackPointer += 4;
            *(int32_t *)(mem + stackPointer) = *(int32_t *)(mem + stackPointer) == val;
#ifdef DEBUG
            printf("eq\n");
#endif
            continue;
        }
        case Neq:
        {
            int32_t val = *(int32_t *)(mem + stackPointer);
            stackPointer += 4;
            *(int32_t *)(mem + stackPointer) = *(int32_t *)(mem + stackPointer) != val;
#ifdef DEBUG
            printf("neq\n");
#endif
            continue;
        }
        case Lt:
        {
            int32_t val = *(int32_t *)(mem + stackPointer);
            stackPointer += 4;
            *(int32_t *)(mem + stackPointer) = *(int32_t *)(mem + stackPointer) < val;
#ifdef DEBUG
            printf("lt\n");
#endif
            continue;
        }
        case Bt:
        {
            int32_t val = *(int32_t *)(mem + stackPointer);
            stackPointer += 4;
            *(int32_t *)(mem + stackPointer) = *(int32_t *)(mem + stackPointer) > val;
#ifdef DEBUG
            printf("bt\n");
#endif
            continue;
        }
        case Lte:
        {
            int32_t val = *(int32_t *)(mem + stackPointer);
            stackPointer += 4;
            *(int32_t *)(mem + stackPointer) = *(int32_t *)(mem + stackPointer) <= val;
#ifdef DEBUG
            printf("lte\n");
#endif
            continue;
        }
        case Bte:
        {
            int32_t val = *(int32_t *)(mem + stackPointer);
            stackPointer += 4;
            *(int32_t *)(mem + stackPointer) = *(int32_t *)(mem + stackPointer) >= val;
#ifdef DEBUG
            printf("bte\n");
#endif
            continue;
        }

        case 0x36:
        case 0x37:
        case 0x38:
        case 0x39:
        case 0x3A:
        case 0x3B:
        case 0x3C:
        case 0x3D:
        case 0x3E:
        case 0x3F:
            return EINVOP;

        case Sin:
        {
            // *(int32_t *)(mem + stackPointer) = sin(*(int32_t *)(mem + stackPointer) / 1000.0f) * 1000;
            *(int32_t *)(mem + stackPointer) = fastSin(mem[stackPointer]);
            continue;
        }
        case Cos:
        {
            // *(int32_t *)(mem + stackPointer) = cos(*(int32_t *)(mem + stackPointer) / 1000.0f) * 1000;
            *(int32_t *)(mem + stackPointer) = fastCos(mem[stackPointer]);
            continue;
        }

        default:
#ifdef DEBUG
            printf("unknown opcode %d\n", mem[exePointer - 1]);
#endif
            return EINVOP;
        }
    }
    return 0;
}
