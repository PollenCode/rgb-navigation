import { OpCode } from "./target";

export class Interpreter {
    memory: Buffer;
    stackPointer: number;
    exePointer: number;

    constructor(memory: Buffer, entryPoint: number) {
        this.memory = memory;
        this.exePointer = entryPoint;
        this.stackPointer = memory.length;
    }

    writeInt(pos: number, value: number) {
        this.memory[pos] = value & 0x000000ff;
        this.memory[pos + 1] = value & 0x0000ff00;
        this.memory[pos + 2] = value & 0x00ff0000;
        this.memory[pos + 3] = value & 0xff000000;
    }

    readInt(pos: number): number {
        return this.memory[pos] | (this.memory[pos + 1] << 8) | (this.memory[pos + 2] << 16) | (this.memory[pos + 3] << 24);
    }

    executeNext() {
        let op: OpCode = this.memory[this.exePointer++];
        switch (op) {
            case OpCode.Push: {
                let addr = this.memory[this.exePointer++] | (this.memory[this.exePointer++] << 8);
                this.stackPointer -= 4;
                this.writeInt(this.stackPointer, this.readInt(addr));
                break;
            }
            case OpCode.Pop: {
                let addr = this.memory[this.exePointer++] | (this.memory[this.exePointer++] << 8);
                this.writeInt(addr, this.readInt(this.stackPointer));
                this.stackPointer += 4;
                break;
            }
            case OpCode.PushConst8: {
                let value = this.memory[this.exePointer++];
                this.stackPointer -= 4;
                this.writeInt(this.stackPointer, value);
                break;
            }
            case OpCode.PushConst16: {
                let value = this.memory[this.exePointer++] | (this.memory[this.exePointer++] << 8);
                this.stackPointer -= 4;
                this.writeInt(this.stackPointer, value);
                break;
            }
            case OpCode.PushConst32: {
                let value =
                    this.memory[this.exePointer++] |
                    (this.memory[this.exePointer++] << 8) |
                    (this.memory[this.exePointer++] << 16) |
                    (this.memory[this.exePointer++] << 24);
                this.stackPointer -= 4;
                this.writeInt(this.stackPointer, value);
                break;
            }
            case OpCode.Dup: {
                this.stackPointer -= 4;
                this.writeInt(this.stackPointer, this.readInt(this.stackPointer + 4));
                break;
            }
            case OpCode.Push8: {
                let addr = this.memory[this.exePointer++] | (this.memory[this.exePointer++] << 8);
                this.stackPointer -= 4;
                this.writeInt(this.stackPointer, this.memory[addr]);
                break;
            }
            case OpCode.Halt: {
                return false;
            }
            case OpCode.Add: {
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) + this.readInt(this.stackPointer));
                this.stackPointer += 4;
                break;
            }
            case OpCode.Sub: {
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) - this.readInt(this.stackPointer));
                this.stackPointer += 4;
                break;
            }
            case OpCode.Mul: {
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) * this.readInt(this.stackPointer));
                this.stackPointer += 4;
                break;
            }
            case OpCode.Div: {
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) / this.readInt(this.stackPointer));
                this.stackPointer += 4;
                break;
            }
            case OpCode.Mod: {
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) % this.readInt(this.stackPointer));
                this.stackPointer += 4;
                break;
            }
            case OpCode.Inv: {
                this.writeInt(this.stackPointer, -this.readInt(this.stackPointer));
                break;
            }
            case OpCode.Abs: {
                let val = this.readInt(this.stackPointer);
                this.writeInt(this.stackPointer, val < 0 ? -val : val);
                break;
            }
            case OpCode.Jrnz: {
                let rel = this.memory[this.exePointer++];
                if (this.readInt(this.stackPointer)) {
                    this.exePointer += rel;
                }
                this.stackPointer += 4;
                break;
            }
            case OpCode.Jrz: {
                let rel = this.memory[this.exePointer++];
                if (!this.readInt(this.stackPointer)) {
                    this.exePointer += rel;
                }
                this.stackPointer += 4;
                break;
            }
            case OpCode.Jr: {
                let rel = this.memory[this.exePointer++];
                this.exePointer += rel;
                break;
            }
            case OpCode.Eq: {
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) === this.readInt(this.stackPointer) ? 1 : 0);
                this.stackPointer += 4;
                break;
            }
            case OpCode.Neq: {
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) !== this.readInt(this.stackPointer) ? 1 : 0);
                this.stackPointer += 4;
                break;
            }
            case OpCode.Lt: {
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) < this.readInt(this.stackPointer) ? 1 : 0);
                this.stackPointer += 4;
                break;
            }
            case OpCode.Lte: {
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) <= this.readInt(this.stackPointer) ? 1 : 0);
                this.stackPointer += 4;
                break;
            }
            case OpCode.Bt: {
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) > this.readInt(this.stackPointer) ? 1 : 0);
                this.stackPointer += 4;
                break;
            }
            case OpCode.Bte: {
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) >= this.readInt(this.stackPointer) ? 1 : 0);
                this.stackPointer += 4;
                break;
            }
            case OpCode.Out: {
                console.log("out", this.readInt(this.stackPointer));
                this.stackPointer += 4;
            }

            default: {
                throw new Error(`Invalid instruction ${op} at ${this.exePointer - 1}`);
            }
        }
        return true;
    }
}
