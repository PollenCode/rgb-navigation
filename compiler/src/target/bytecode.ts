import { IntType, Type, VoidType } from "../types";
import debug from "debug";
import {
    AssignmentToken,
    BlockToken,
    CallToken,
    CompareToken,
    HaltToken,
    IfToken,
    LogicToken,
    MulToken,
    ReferenceToken,
    SumToken,
    TernaryToken,
    Token,
    TokenId,
    ValueToken,
} from "../token";
import { Func, Scope, Target, Var } from "../compiler";

const logger = debug("rgb:compiler:bytecode");

type VariableLocation = number;
type FunctionLocation = (writer: CodeWriter) => void | number;

function align4(n: number) {
    return (n & ~0x3) + 4;
}

export class ByteCodeTarget implements Target {
    writer!: CodeWriter;

    private currentVarAllocation: number = 0;
    private maxVarAllocation: number = 0;

    allocateVariable(type: Type): VariableLocation {
        let address = this.currentVarAllocation;
        this.currentVarAllocation += 4; // type.size
        if (this.currentVarAllocation > this.maxVarAllocation) {
            this.maxVarAllocation = this.currentVarAllocation;
        }
        return address;
    }

    allocateVariableAt(address: number, type: Type): VariableLocation {
        if (address + type.size > this.currentVarAllocation) {
            this.currentVarAllocation = address + type.size;
        }
        if (this.currentVarAllocation > this.maxVarAllocation) {
            this.maxVarAllocation = this.currentVarAllocation;
        }
        return address;
    }

    allocateFunction(id: number): FunctionLocation;
    allocateFunction(emitter: (writer: CodeWriter) => void): FunctionLocation;
    allocateFunction(e: any): FunctionLocation {
        return e;
    }

    /**
     * Returns the bytecode generated by `compile()`
     */
    getProgram() {
        return this.writer.buffer;
    }

    /**
     * Combines data and bytecode into one buffer, returning the entryPoint and buffer
     */
    getLinkedProgram(): [number, Buffer] {
        let memory = Buffer.alloc(this.maxVarAllocation);
        let program = this.getProgram();
        let entryPoint = align4(memory.length);
        let buffer = Buffer.alloc(entryPoint + program.length);
        memory.copy(buffer, 0, 0, entryPoint);
        program.copy(buffer, entryPoint, 0, program.length);
        return [entryPoint, buffer];
    }

    private compileToken(token: Token, isRoot: boolean = false) {
        switch (token.id) {
            case TokenId.Ternary:
                return this.compileTernary(token as TernaryToken, isRoot);
            case TokenId.Mul:
                return this.compileMul(token as MulToken, isRoot);
            case TokenId.Sum:
                return this.compileSum(token as SumToken, isRoot);
            case TokenId.Compare:
                return this.compileCompare(token as CompareToken, isRoot);
            case TokenId.Call:
                return this.compileCall(token as CallToken, isRoot);
            case TokenId.Assignment:
                return this.compileAssignment(token as AssignmentToken, isRoot);
            case TokenId.Halt:
                return this.compileHalt(token as HaltToken);
            case TokenId.If:
                return this.compileIf(token as IfToken);
            case TokenId.Reference:
                return this.compileReference(token as ReferenceToken, isRoot);
            case TokenId.Value:
                return this.compileValue(token as ValueToken, isRoot);
            case TokenId.Block:
                return this.compileBlock(token as BlockToken, isRoot);
            case TokenId.Logic:
                return this.compileLogic(token as LogicToken, isRoot);
            default:
                throw new Error(`Token ${token.id} not implemented`);
        }
    }

    private compileTernary(token: TernaryToken, isRoot: boolean) {
        if (token.constantValue !== undefined) {
            this.writer.pushConst(token.constantValue);
            return;
        }

        this.compileToken(token.condition);

        let jrzLocation = this.writer.position;
        this.writer.position += 2;

        this.compileToken(token.trueOp);
        let jrLocation = this.writer.position;
        this.writer.position += 2;

        let falseLocation = this.writer.position;
        this.compileToken(token.falseOp);

        let save = this.writer.position;
        this.writer.position = jrzLocation;
        this.writer.jrz(falseLocation - jrzLocation - 2);
        this.writer.position = jrLocation;
        this.writer.jr(save - jrLocation - 2);
        this.writer.position = save;
    }

    private compileMul(token: MulToken, isRoot: boolean) {
        if (token.constantValue !== undefined) {
            this.writer.pushConst(token.constantValue);
        } else {
            if (token.op1.constantValue !== undefined) {
                this.writer.pushConst(token.op1.constantValue);
            } else {
                this.compileToken(token.op1);
            }
            if (token.op2.constantValue !== undefined) {
                this.writer.pushConst(token.op2.constantValue);
            } else {
                this.compileToken(token.op2);
            }
            switch (token.operator) {
                case "*":
                    this.writer.mul();
                    break;
                case "/":
                    this.writer.div();
                    break;
                case "%":
                    this.writer.mod();
                    break;
            }
        }
    }

    private compileSum(token: SumToken, isRoot: boolean) {
        if (token.constantValue !== undefined) {
            this.writer.pushConst(token.constantValue);
        } else {
            if (token.op1.constantValue !== undefined) {
                this.writer.pushConst(token.op1.constantValue);
                // code.add8(this.op1.constantValue);
                // return;
            } else {
                this.compileToken(token.op1);
            }
            if (token.op2.constantValue !== undefined) {
                this.writer.pushConst(token.op2.constantValue);
                // code.add8(this.op2.constantValue);
                // return;
            } else {
                this.compileToken(token.op2);
            }
            switch (token.operator) {
                case "+":
                    this.writer.add();
                    break;
                case "-":
                    this.writer.sub();
                    break;
            }
        }
    }

    private compileReference(token: ReferenceToken, isRoot: boolean) {
        if (token.variable.constant) {
            this.writer.pushConst(token.constantValue!);
        } else {
            let v = token.variable;
            if (v.type.size === 1) this.writer.push8(v.location as VariableLocation);
            else this.writer.push(v.location as VariableLocation);
        }
    }

    private compileValue(token: ValueToken, isRoot: boolean) {
        this.writer.pushConst(parseInt(token.value));
    }

    private compileAssignment(token: AssignmentToken, isRoot: boolean) {
        if (token.variable.constant) {
            return;
        }

        let v = token.variable;
        if (token.type && v.location === undefined) {
            // This is a declaration
            v.location = this.allocateVariable(token.type);
        }

        if (token.value) {
            this.compileToken(token.value);
            if (!isRoot) {
                this.writer.dup();
            }
            if (v.type.size === 1) this.writer.pop8(v.location as VariableLocation);
            else this.writer.pop(v.location as VariableLocation);
        }
    }

    private compileBlock(token: BlockToken, isRoot: boolean) {
        token.statements.forEach((e) => this.compileToken(e, true));
    }

    private compileCompare(token: CompareToken, isRoot: boolean) {
        if (token.constantValue !== undefined) {
            this.writer.pushConst(token.constantValue);
            return;
        }
        this.compileToken(token.op1);
        this.compileToken(token.op2);
        switch (token.operator) {
            case "!=":
                this.writer.neq();
                break;
            case "==":
                this.writer.eq();
                break;
            case ">":
                this.writer.bt();
                break;
            case ">=":
                this.writer.bte();
                break;
            case "<":
                this.writer.lt();
                break;
            case "<=":
                this.writer.lte();
                break;
            default:
                throw new Error("Invalid compare operator");
        }
    }

    private compileIf(token: IfToken) {
        if (token.condition.constantValue !== undefined) {
            if (token.condition.constantValue !== 0) {
                this.compileToken(token.ifBlock);
            } else if (token.elseBlock) {
                this.compileToken(token.elseBlock);
            }
            return;
        }

        this.compileToken(token.condition);
        if (!token.elseBlock) {
            let jrzLocation = this.writer.position;
            this.writer.position += 2;

            this.compileToken(token.ifBlock);

            let save = this.writer.position;
            this.writer.position = jrzLocation;
            this.writer.jrz(save - jrzLocation - 2);
            this.writer.position = save;
        } else {
            let jrzLocation = this.writer.position;
            this.writer.position += 2;

            this.compileToken(token.ifBlock);
            let jrLocation = this.writer.position;
            this.writer.position += 2;

            let elseLocation = this.writer.position;
            this.compileToken(token.elseBlock);

            let save = this.writer.position;
            this.writer.position = jrzLocation;
            this.writer.jrz(elseLocation - jrzLocation - 2);
            this.writer.position = jrLocation;
            this.writer.jr(save - jrLocation - 2);
            this.writer.position = save;
        }

        // <- TODO: deallocate variables allocated in if statement
    }

    private compileHalt(token: HaltToken) {
        this.writer.halt();
    }

    private compileCall(token: CallToken, isRoot: boolean) {
        let func = token.function as Func<FunctionLocation>;
        if (func.location === undefined) throw new Error(`Location of function ${token.functionName} must be known at compile time.`);

        token.parameters.forEach((e) => this.compileToken(e));

        if (typeof func.location === "number") {
            this.writer.call(func.location);
        } else {
            func.location(this.writer);
        }

        if (isRoot && !(func.returnType instanceof VoidType)) {
            this.writer.consume();
        }
    }

    private compileLogic(token: LogicToken, isRoot: boolean) {
        this.compileToken(token.op1);
        if (!isRoot) {
            this.writer.dup();
        }
        let jumpLocation = this.writer.position;
        this.writer.position += 2;

        if (!isRoot) {
            this.writer.consume();
        }
        this.compileToken(token.op2);
        if (isRoot) {
            this.writer.consume();
        }

        let save = this.writer.position;
        this.writer.position = jumpLocation;
        if (token.operator === "&&") {
            this.writer.jrz(save - jumpLocation - 2);
        } else {
            this.writer.jrnz(save - jumpLocation - 2);
        }
        this.writer.position = save;
    }

    compile(token: BlockToken) {
        this.writer = new CodeWriter();
        token.statements.forEach((e) => this.compileToken(e, true));
        this.writer.halt();
    }

    defineDefaultMacros(scope: Scope) {
        scope.defineFunc("sin", {
            parameterCount: 1,
            returnType: new IntType(),
            location: this.allocateFunction((writer) => {
                writer.sin();
            }),
        });
        scope.defineFunc("cos", {
            parameterCount: 1,
            returnType: new IntType(),
            location: this.allocateFunction((writer) => {
                writer.cos();
            }),
        });
        scope.defineFunc("abs", {
            parameterCount: 1,
            returnType: new IntType(),
            location: this.allocateFunction((writer) => {
                writer.abs();
            }),
        });
        // context.defineFunction("tan", new IntType(), 1, (writer) => {
        //     writer.tan();
        // });
    }
}

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
    Consume = 0x0a,
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
        } else if (num >= 65536 || num < 0) {
            this.pushConst32(num);
        } else if (num >= 256) {
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
    consume() {
        logger("consume");
        this.write8(OpCode.Consume);
    }
    add8(value: number) {
        if (value >= 127 || value <= -128) throw new Error("Add value too big");
        logger("add8", value);
        this.write8(OpCode.Add8);
        this.write8(value);
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
        logger("jrz", offset);
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
    call(index: number) {
        logger("call", index);
        this.write8(OpCode.Call);
        this.write8(index);
    }
    sin() {
        logger("sin");
        this.write8(OpCode.Sin);
    }
    cos() {
        logger("cos");
        this.write8(OpCode.Cos);
    }
    tan() {
        logger("tan");
        this.write8(OpCode.Tan);
    }
}
