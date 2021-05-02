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

    AddConst8 = 0x01,
    AddConst16 = 0x02,
    AddConst32 = 0x03,

    SubConst8 = 0x04,
    SubConst16 = 0x05,
    SubConst32 = 0x06,

    MulConst8 = 0x07,
    MulConst16 = 0x08,
    MulConst32 = 0x09,

    DivConst8 = 0x0a,
    DivConst16 = 0x0b,
    DivConst32 = 0x0c,

    ModConst8 = 0x0d,
    ModConst16 = 0x0e,
    ModConst32 = 0x0f,
}

export class CodeWriter extends BinaryWriter {
    addConst8(dest: number, num: number) {
        this.write8(OpCode.AddConst8);
        this.write16(dest);
        this.write8(num);
    }

    addConst16(dest: number, num: number) {
        this.write8(OpCode.AddConst16);
        this.write16(dest);
        this.write16(num);
    }

    addConst32(dest: number, num: number) {
        this.write8(OpCode.AddConst32);
        this.write16(dest);
        this.write32(num);
    }
}
