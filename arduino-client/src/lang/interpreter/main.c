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

    unsigned char *buffer = (unsigned char *)malloc(size);

    for (int i = 0; i < size; i++)
    {
        buffer[i] = fgetc(fd);
    }

    fclose(fd);

    printf("interpreting\n");

    for (int i = 0; i < size;)
    {
        unsigned char op = buffer[i++];
        switch (op)
        {
        case Noop:
            break;
        case Push:
            printf("push %d\n", buffer[i++] | (buffer[i++] << 8));
            break;
        case Pop:
            printf("pop %d\n", buffer[i++] | (buffer[i++] << 8));
            break;
        case PopVoid:
            printf("popvoid\n");
            break;
        case Push8:
            printf("pushconst8 %d\n", buffer[i++]);
            break;
        case Push16:
            printf("pushconst16 %d\n", buffer[i++] | (buffer[i++] << 8));
            break;
        case Push32:
            printf("pushconst32 %d\n", buffer[i++] | (buffer[i++] << 8) | (buffer[i++] << 16) | (buffer[i++] << 24));
            break;
        case Swap:
            printf("swap\n");
            break;
        case Add:
            printf("add\n");
            break;
        case Sub:
            printf("sub\n");
            break;
        case Mul:
            printf("mul\n");
            break;
        case Div:
            printf("div\n");
            break;
        case Mod:
            printf("mod\n");
            break;
        case Inv:
            printf("inv\n");
            break;
        case Abs:
            printf("abs\n");
            break;

        default:
            printf("unknown opcode %d\n", op);
            break;
        }
    }
}