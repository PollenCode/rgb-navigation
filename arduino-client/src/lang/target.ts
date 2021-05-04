import { NumberType, Type } from "./types";
import debug from "debug";

const logger = debug("rgb:compiler");

export class BinaryWriter {
    position: number = 0;
    buffer: Buffer;

    constructor(initialSize: number = 64) {
        this.buffer = Buffer.alloc(initialSize);
    }

    write8(x: number) {
        if (this.position >= this.buffer.length) {
            let b = this.buffer;
            this.buffer = Buffer.alloc(this.buffer.length * 2);
            b.copy(this.buffer, 0, 0, b.length);
        }
        this.buffer[this.position++] = x & 0xff;
    }

    write16(x: number) {
        this.write8(x);
        this.write8(x >> 8);
    }

    write32(x: number) {
        this.write8(x);
        this.write8(x >> 8);
        this.write8(x >> 16);
        this.write8(x >> 24);
    }
}

export enum OpCode {
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
}

export class CodeWriter extends BinaryWriter {
    push(src: number) {
        logger("push", src);
        this.write8(OpCode.Push);
        this.write16(src);
    }
    pop(src: number) {
        logger("pop", src);
        this.write8(OpCode.Pop);
        this.write16(src);
    }
    pushConst(num: number) {
        if (num >= 2147483648 || num < -2147483648) {
            throw new Error("Number too big");
        } else if (num >= 32768 || num < -32768) {
            this.pushConst32(num);
        } else if (num >= 128 || num < -128) {
            this.pushConst16(num);
        } else {
            this.pushConst8(num);
        }
    }
    pushConst8(num: number) {
        logger("pushConst8", num);
        this.write8(OpCode.Push8);
        this.write8(num);
    }
    pushConst16(num: number) {
        logger("pushConst16", num);
        this.write8(OpCode.Push16);
        this.write16(num);
    }
    pushConst32(num: number) {
        logger("pushConst32", num);
        this.write8(OpCode.Push32);
        this.write32(num);
    }
    popVoid() {
        logger("popVoid");
        this.write8(OpCode.PopVoid);
    }
    swap() {
        logger("swap");
        this.write8(OpCode.Swap);
    }
    add() {
        logger("add");
        this.write8(OpCode.Add);
    }
    sub() {
        logger("sub");
        this.write8(OpCode.Sub);
    }
    mul() {
        logger("mul");
        this.write8(OpCode.Mul);
    }
    div() {
        logger("div");
        this.write8(OpCode.Div);
    }
    mod() {
        logger("mod");
        this.write8(OpCode.Mod);
    }
    inv() {
        logger("inv");
        this.write8(OpCode.Inv);
    }
    abs() {
        logger("abs");
        this.write8(OpCode.Abs);
    }
}
