export class BinaryWriter {
    position: number = 0;
    buffer: Buffer;

    constructor(initialSize: number = 64) {
        this.buffer = Buffer.alloc(initialSize);
    }

    write(byte: number) {
        if (this.position >= this.buffer.length) {
            let b = this.buffer;
            this.buffer = Buffer.alloc(this.buffer.length * 2);
            b.copy(this.buffer, 0, 0, b.length);
        }
        this.buffer[this.position++] = byte;
    }
}

export class CodeWriter extends BinaryWriter {
    addConst8(dest: number, num: number) {}

    addConst16(dest: number, num: number) {}

    addConst32(dest: number, num: number) {}
}
