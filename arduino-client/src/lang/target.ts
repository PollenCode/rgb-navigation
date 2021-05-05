import { NumberType, Type } from "./types";
import debug from "debug";

const logger = debug("rgb:compiler");

export class BinaryWriter {
    position: number = 0;
    size: number = 0;
    private _buffer: Buffer;

    constructor(initialSize: number = 64) {
        this._buffer = Buffer.alloc(initialSize);
    }

    get buffer() {
        return this._buffer.slice(0, this.size);
    }

    write8(x: number) {
        if (this.position >= this._buffer.length) {
            let b = this._buffer;
            this._buffer = Buffer.alloc(this._buffer.length * 2);
            b.copy(this._buffer, 0, 0, b.length);
        }
        this._buffer[this.position++] = x & 0xff;
        if (this.position > this.size) {
            this.size = this.position;
        }
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
    PushConst8 = 0x03,
    PushConst16 = 0x04,
    PushConst32 = 0x05,
    Dup = 0x06,
    Swap = 0x07,
    Pop8 = 0x08,
    Push8 = 0x09,
    Halt = 0x0f,

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

    Eq = 0x30,
    Neq = 0x31,
    Lt = 0x32,
    Bt = 0x33,
    Lte = 0x34,
    Bte = 0x35,

    Out = 0xa0,
}

export class CodeWriter extends BinaryWriter {
    push(src: number) {
        logger("push", src);
        this.write8(OpCode.Push);
        this.write16(src);
    }
    push8(src: number) {
        logger("push8", src);
        this.write8(OpCode.Push8);
        this.write16(src);
    }
    pop8(src: number) {
        logger("pop8", src);
        this.write8(OpCode.Pop8);
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
        this.write8(OpCode.PushConst8);
        this.write8(num);
    }
    pushConst16(num: number) {
        logger("pushConst16", num);
        this.write8(OpCode.PushConst16);
        this.write16(num);
    }
    pushConst32(num: number) {
        logger("pushConst32", num);
        this.write8(OpCode.PushConst32);
        this.write32(num);
    }
    dup() {
        logger("dup");
        this.write8(OpCode.Dup);
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
    add8(value: number) {
        if (value >= 127 || value <= -128) throw new Error("Add value too big");
        logger("add8", value);
        this.write8(OpCode.Add8);
        this.write8(value);
    }
    out() {
        logger("out");
        this.write8(OpCode.Out);
    }
    halt() {
        logger("halt");
        this.write8(OpCode.Halt);
    }
    jrnz(offset: number) {
        if (offset >= 127 || offset <= -128) throw new Error("Jump too far");
        logger("jnz", offset);
        this.write8(OpCode.Jrnz);
        this.write8(offset);
    }
    jrz(offset: number) {
        if (offset >= 127 || offset <= -128) throw new Error("Jump too far");
        logger("jz", offset);
        this.write8(OpCode.Jrz);
        this.write8(offset);
    }
    jr(offset: number) {
        if (offset >= 127 || offset <= -128) throw new Error("Jump too far");
        logger("jr", offset);
        this.write8(OpCode.Jr);
        this.write8(offset);
    }
    eq() {
        logger("eq");
        this.write8(OpCode.Eq);
    }
    neq() {
        logger("neq");
        this.write8(OpCode.Neq);
    }
    lt() {
        logger("lt");
        this.write8(OpCode.Lt);
    }
    bt() {
        logger("bt");
        this.write8(OpCode.Bt);
    }
    lte() {
        logger("lte");
        this.write8(OpCode.Lte);
    }
    bte() {
        logger("bte");
        this.write8(OpCode.Bte);
    }
}
