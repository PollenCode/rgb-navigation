import { OpCode } from "./target";
import debug from "debug";

const info = debug("rgb:interpreter");

export class Interpreter {
    readonly memory: Uint8Array;
    stackPointer: number;
    exePointer: number;
    debug = false;

    constructor(memory: Uint8Array, entryPoint: number, memorySize = 2 ** 16) {
        this.memory = new Uint8Array(memorySize);
        for (let i = 0; i < memory.length; i++) {
            this.memory[i] = memory[i];
        }
        this.exePointer = entryPoint;
        this.stackPointer = memorySize;
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
            case OpCode.Noop:
                break;
            case OpCode.Push: {
                let addr = this.memory[this.exePointer++] | (this.memory[this.exePointer++] << 8);
                if (this.debug) info("push", addr);
                this.stackPointer -= 4;
                this.writeInt(this.stackPointer, this.readInt(addr));
                break;
            }
            case OpCode.Pop: {
                let addr = this.memory[this.exePointer++] | (this.memory[this.exePointer++] << 8);
                if (this.debug) info("pop", addr);
                this.writeInt(addr, this.readInt(this.stackPointer));
                this.stackPointer += 4;
                break;
            }
            case OpCode.PushConst8: {
                let value = this.memory[this.exePointer++];
                if (this.debug) info("pushconst8", value);
                this.stackPointer -= 4;
                this.writeInt(this.stackPointer, value);
                break;
            }
            case OpCode.PushConst16: {
                let value = this.memory[this.exePointer++] | (this.memory[this.exePointer++] << 8);
                if (this.debug) info("pushconst16", value);
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
                if (this.debug) info("pushconst32", value);
                this.stackPointer -= 4;
                this.writeInt(this.stackPointer, value);
                break;
            }
            case OpCode.Dup: {
                if (this.debug) info("dup");
                this.stackPointer -= 4;
                this.writeInt(this.stackPointer, this.readInt(this.stackPointer + 4));
                break;
            }
            case OpCode.Push8: {
                let addr = this.memory[this.exePointer++] | (this.memory[this.exePointer++] << 8);
                if (this.debug) info("push8", addr);
                this.stackPointer -= 4;
                this.writeInt(this.stackPointer, this.memory[addr]);
                break;
            }
            case OpCode.Pop8: {
                let addr = this.memory[this.exePointer++] | (this.memory[this.exePointer++] << 8);
                if (this.debug) info("pop8", addr);
                this.memory[addr] = this.memory[this.stackPointer];
                this.stackPointer += 4;
                break;
            }
            case OpCode.Halt: {
                if (this.debug) info("halt");
                return false;
            }
            case OpCode.Add: {
                if (this.debug) info("add");
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) + this.readInt(this.stackPointer));
                this.stackPointer += 4;
                break;
            }
            case OpCode.Sub: {
                if (this.debug) info("sub");
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) - this.readInt(this.stackPointer));
                this.stackPointer += 4;
                break;
            }
            case OpCode.Mul: {
                if (this.debug) info("mul");
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) * this.readInt(this.stackPointer));
                this.stackPointer += 4;
                break;
            }
            case OpCode.Div: {
                if (this.debug) info("div");
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) / this.readInt(this.stackPointer));
                this.stackPointer += 4;
                break;
            }
            case OpCode.Mod: {
                if (this.debug) info("mod");
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) % this.readInt(this.stackPointer));
                this.stackPointer += 4;
                break;
            }
            case OpCode.Inv: {
                if (this.debug) info("inv");
                this.writeInt(this.stackPointer, -this.readInt(this.stackPointer));
                break;
            }
            case OpCode.Abs: {
                if (this.debug) info("abs");
                let val = this.readInt(this.stackPointer);
                this.writeInt(this.stackPointer, val < 0 ? -val : val);
                break;
            }
            case OpCode.Jrnz: {
                if (this.debug) info("jrnz");
                let rel = this.memory[this.exePointer++];
                if (this.readInt(this.stackPointer)) {
                    this.exePointer += rel;
                }
                this.stackPointer += 4;
                break;
            }
            case OpCode.Jrz: {
                if (this.debug) info("jrz");
                let rel = this.memory[this.exePointer++];
                if (!this.readInt(this.stackPointer)) {
                    this.exePointer += rel;
                }
                this.stackPointer += 4;
                break;
            }
            case OpCode.Jr: {
                if (this.debug) info("jr");
                let rel = this.memory[this.exePointer++];
                this.exePointer += rel;
                break;
            }
            case OpCode.Eq: {
                if (this.debug) info("eq");
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) === this.readInt(this.stackPointer) ? 1 : 0);
                this.stackPointer += 4;
                break;
            }
            case OpCode.Neq: {
                if (this.debug) info("neq");
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) !== this.readInt(this.stackPointer) ? 1 : 0);
                this.stackPointer += 4;
                break;
            }
            case OpCode.Lt: {
                if (this.debug) info("lt");
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) < this.readInt(this.stackPointer) ? 1 : 0);
                this.stackPointer += 4;
                break;
            }
            case OpCode.Lte: {
                if (this.debug) info("lte");
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) <= this.readInt(this.stackPointer) ? 1 : 0);
                this.stackPointer += 4;
                break;
            }
            case OpCode.Bt: {
                if (this.debug) info("bt");
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) > this.readInt(this.stackPointer) ? 1 : 0);
                this.stackPointer += 4;
                break;
            }
            case OpCode.Bte: {
                if (this.debug) info("bte");
                this.writeInt(this.stackPointer + 4, this.readInt(this.stackPointer + 4) >= this.readInt(this.stackPointer) ? 1 : 0);
                this.stackPointer += 4;
                break;
            }
            case OpCode.Out: {
                info("out", this.readInt(this.stackPointer));
                this.stackPointer += 4;
                break;
            }

            default: {
                throw new Error(`Invalid instruction 0x${op.toString(16)} (${op}) at ${this.exePointer - 1}`);
            }
        }
        return true;
    }
}
