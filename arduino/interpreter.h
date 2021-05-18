#pragma once
#include <stdint.h>
#include <stdbool.h>
#include "sintable.h"

#define EINVOP -2
#define EOVERFLOW -1
#define EINVCALL -3

extern uint16_t exePointer;
extern uint16_t stackPointer;
extern uint8_t mem[];
extern uint32_t executed;
bool (*callHandler)(uint8_t);

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
    Consume = 0x0A,
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

    Sin = 0x40,
    Cos = 0x41,
    Tan = 0x42,
};

int run();