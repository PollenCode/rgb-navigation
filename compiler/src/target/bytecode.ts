import { IntType, NumberType, Type, VoidType } from "../types";
import debug from "debug";
import {
    AssignmentToken,
    BlockToken,
    CallToken,
    CompareToken,
    HaltToken,
    IfToken,
    MulToken,
    ReferenceToken,
    SumToken,
    TernaryToken,
    Token,
    TokenId,
    ValueToken,
} from "../token";
import { Target } from "../target";

const logger = debug("rgb:compiler:emit");

type TokenHandlers = {
    [T in TokenId]: (token: Token, isRoot: boolean) => void;
};

export class ByteCodeTarget implements Target {
    writer;
    tokenHandlers = {
        [TokenId.Ternary]: this.compileTernary,
    };

    constructor() {
        this.writer = new CodeWriter();
    }

    private compileToken(token: Token, isRoot: boolean = false) {
        switch (token.id) {
            case TokenId.Ternary:
                return this.compileTernary(token as TernaryToken, isRoot);
        }
    }

    private compileTernary(token: TernaryToken, isRoot: boolean) {
        if (token.type instanceof NumberType && token.type.constantValue !== undefined) {
            this.writer.pushConst(token.type.constantValue);
            return;
        }

        this.compileToken(token.op);

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
        if (token.type.constantValue !== undefined) {
            this.writer.pushConst(token.type.constantValue);
        } else {
            if (token.op1.type.constantValue !== undefined) {
                this.writer.pushConst(token.op1.type.constantValue);
            } else {
                this.compileToken(token.op1);
            }
            if (token.op2.type.constantValue !== undefined) {
                this.writer.pushConst(token.op2.type.constantValue);
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
        if (token.type.constantValue !== undefined) {
            this.writer.pushConst(token.type.constantValue);
        } else {
            if (token.op1.type.constantValue !== undefined) {
                this.writer.pushConst(token.op1.type.constantValue);
                // code.add8(this.op1.type.constantValue);
                // return;
            } else {
                this.compileToken(token.op1);
            }
            if (token.op2.type.constantValue !== undefined) {
                this.writer.pushConst(token.op2.type.constantValue);
                // code.add8(this.op2.type.constantValue);
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
        if (token.type instanceof IntType && token.type.constantValue !== undefined) {
            this.writer.pushConst(token.type.constantValue!);
        } else {
            let v = token.context.vars.get(token.varName)!;
            if (v.type.size === 1) this.writer.push8(v.location);
            else this.writer.push(v.location);
        }
    }

    private compileValue(token: ValueToken, isRoot: boolean) {
        this.writer.pushConst(parseInt(token.value));
    }

    private compileAssignment(token: AssignmentToken, isRoot: boolean) {
        let v = token.context.vars.get(token.varName)!;
        if (token.value && (token.type.constantValue === undefined || v.volatile)) {
            this.compileToken(token.value);
            if (!isRoot) {
                this.writer.dup();
            }
            let v = token.context.vars.get(token.varName)!;
            if (v.type.size === 1) this.writer.pop8(v.location);
            else this.writer.pop(v.location);
        }
    }

    private compileBlock(token: BlockToken) {
        token.statements.forEach((e) => this.compileToken(e, true));
    }

    private compileCompare(token: CompareToken) {
        if (token.type instanceof NumberType && token.type.constantValue !== undefined) {
            this.writer.pushConst(token.type.constantValue);
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
        if (token.condition.type instanceof NumberType && token.condition.type.constantValue !== undefined) {
            if (token.condition.type.constantValue !== 0) {
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
    }

    compileHalt(token: HaltToken) {
        this.writer.halt();
    }

    compileCall(token: CallToken, isRoot: boolean) {
        let func = token.context.functions.get(token.functionName)!;
        token.parameters.forEach((e) => this.compileToken(e));
        if (func.type === "function") {
            this.writer.call(func.id);
        } else if (func.type === "macro") {
            func.emitter(this.writer);
        }
        if (isRoot && !(token.type instanceof VoidType)) {
            this.writer.consume();
        }
    }

    compile(token: BlockToken) {
        token.statements.forEach((e) => this.compileToken(e, true));
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
        this.write8(OpCode.Sin);
    }
    cos() {
        this.write8(OpCode.Cos);
    }
    tan() {
        this.write8(OpCode.Tan);
    }
}
