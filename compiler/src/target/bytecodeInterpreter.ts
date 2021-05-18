import { OpCode } from "./bytecode";
import debug from "debug";

const info = debug("rgb:interpreter");

export class ByteCodeInterpreter {
    readonly memory: Uint8Array;
    stackPointer: number;
    exePointer: number;
    debug = false;
    decompileOnly = false;
    callHandlers = new Map<number, (i: ByteCodeInterpreter) => void>();

    constructor(memory: Uint8Array, entryPoint: number, memorySize = 2 ** 16) {
        this.memory = new Uint8Array(memorySize);
        for (let i = 0; i < memory.length; i++) {
            this.memory[i] = memory[i];
        }
        this.exePointer = entryPoint;
        this.stackPointer = memorySize;
    }

    /**
     * Writes a 32 bit integer to memory at position
     */
    writeInt(pos: number, value: number) {
        this.memory[pos] = value & 0x000000ff;
        this.memory[pos + 1] = value & 0x0000ff00;
        this.memory[pos + 2] = value & 0x00ff0000;
        this.memory[pos + 3] = value & 0xff000000;
    }

    /**
     * Reads a 32 bit integer from memory at position
     */
    readInt(pos: number): number {
        return this.memory[pos] | (this.memory[pos + 1] << 8) | (this.memory[pos + 2] << 16) | (this.memory[pos + 3] << 24);
    }

    /**
     * Pops a value from the stack and returns it
     */
    pop() {
        let val = this.readInt(this.stackPointer);
        this.stackPointer += 4;
        return val;
    }

    /**
     * Pushes a value onto the stack
     */
    push(value: number) {
        this.stackPointer -= 4;
        this.writeInt(this.stackPointer, value);
    }

    /**
     * Returns the top-most stack item without consuming it
     */
    peek() {
        return this.readInt(this.stackPointer);
    }

    executeNext() {
        let op: OpCode = this.memory[this.exePointer++];
        switch (op) {
            case OpCode.Noop:
                break;
            case OpCode.Push: {
                let addr = this.memory[this.exePointer++] | (this.memory[this.exePointer++] << 8);
                if (this.debug) info("push", addr);
                this.push(this.readInt(addr));
                break;
            }
            case OpCode.Pop: {
                let addr = this.memory[this.exePointer++] | (this.memory[this.exePointer++] << 8);
                if (this.debug) info("pop", addr);
                this.writeInt(addr, this.pop());
                break;
            }
            case OpCode.PushConst8: {
                let value = this.memory[this.exePointer++];
                if (this.debug) info("pushconst8", value);
                this.push(value);
                break;
            }
            case OpCode.PushConst16: {
                let value = this.memory[this.exePointer++] | (this.memory[this.exePointer++] << 8);
                if (this.debug) info("pushconst16", value);
                this.push(value);
                break;
            }
            case OpCode.PushConst32: {
                let value =
                    this.memory[this.exePointer++] |
                    (this.memory[this.exePointer++] << 8) |
                    (this.memory[this.exePointer++] << 16) |
                    (this.memory[this.exePointer++] << 24);
                if (this.debug) info("pushconst32", value);
                this.push(value);
                break;
            }
            case OpCode.Dup: {
                if (this.debug) info("dup");
                this.push(this.peek());
                break;
            }
            case OpCode.Push8: {
                let addr = this.memory[this.exePointer++] | (this.memory[this.exePointer++] << 8);
                if (this.debug) info("push8", addr);
                this.push(this.memory[addr]);
                break;
            }
            case OpCode.Pop8: {
                let addr = this.memory[this.exePointer++] | (this.memory[this.exePointer++] << 8);
                if (this.debug) info("pop8", addr);
                this.memory[addr] = this.pop();
                break;
            }
            case OpCode.Halt: {
                if (this.debug) info("halt");
                return false;
            }
            case OpCode.Add: {
                if (this.debug) info("add");
                this.push(this.pop() + this.pop());
                break;
            }
            case OpCode.Sub: {
                if (this.debug) info("sub");
                this.push(this.pop() - this.pop());
                break;
            }
            case OpCode.Mul: {
                if (this.debug) info("mul");
                this.push(this.pop() * this.pop());
                break;
            }
            case OpCode.Div: {
                if (this.debug) info("div");
                this.push(this.pop() / this.pop());
                break;
            }
            case OpCode.Mod: {
                if (this.debug) info("mod");
                this.push(this.pop() % this.pop());
                break;
            }
            case OpCode.Inv: {
                if (this.debug) info("inv");
                this.push(-this.pop());
                break;
            }
            case OpCode.Abs: {
                if (this.debug) info("abs");
                let val = this.pop();
                this.push(val < 0 ? -val : val);
                break;
            }
            case OpCode.Jrnz: {
                if (this.debug) info("jrnz");
                let rel = this.memory[this.exePointer++];
                if (this.pop()) {
                    if (!this.decompileOnly) {
                        this.exePointer += rel;
                    }
                }
                break;
            }
            case OpCode.Jrz: {
                let rel = this.memory[this.exePointer++];
                if (this.debug) info("jrz", rel);
                if (!this.pop()) {
                    if (!this.decompileOnly) {
                        this.exePointer += rel;
                    }
                }
                break;
            }
            case OpCode.Jr: {
                let rel = this.memory[this.exePointer++];
                if (this.debug) info("jr", rel);
                if (!this.decompileOnly) {
                    this.exePointer += rel;
                }
                break;
            }
            case OpCode.Eq: {
                if (this.debug) info("eq");
                this.push(this.pop() === this.pop() ? 1 : 0);
                break;
            }
            case OpCode.Neq: {
                if (this.debug) info("neq");
                this.push(this.pop() !== this.pop() ? 1 : 0);
                break;
            }
            case OpCode.Lt: {
                if (this.debug) info("lt");
                this.push(this.pop() < this.pop() ? 1 : 0);
                break;
            }
            case OpCode.Lte: {
                if (this.debug) info("lte");
                this.push(this.pop() <= this.pop() ? 1 : 0);
                break;
            }
            case OpCode.Bt: {
                if (this.debug) info("bt");
                this.push(this.pop() > this.pop() ? 1 : 0);
                break;
            }
            case OpCode.Bte: {
                if (this.debug) info("bte");
                this.push(this.pop() >= this.pop() ? 1 : 0);
                break;
            }
            case OpCode.Call: {
                let id = this.memory[this.exePointer++];
                if (this.debug) info("call", id);
                if (!this.decompileOnly) {
                    let handler = this.callHandlers.get(id);
                    if (!handler) throw new Error(`Call function with id ${id} not found at ${this.exePointer - 1}`);
                    handler(this);
                }
                break;
            }
            case OpCode.Sin: {
                if (this.debug) info("sin");
                this.push(Math.sin(this.pop() / 1000) * 1000);
                break;
            }
            case OpCode.Cos: {
                if (this.debug) info("cos");
                this.push(Math.cos(this.pop() / 1000) * 1000);
                break;
            }
            case OpCode.Tan: {
                if (this.debug) info("tan");
                this.push(Math.tan(this.pop() / 1000) * 1000);
                break;
            }

            default: {
                throw new Error(`Invalid instruction 0x${op.toString(16)} (${op}) at ${this.exePointer - 1}`);
            }
        }
        return true;
    }
}
