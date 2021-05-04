import { CompilerContext } from "./compiler";
import { Lexer } from "./lexer";
import { CodeWriter } from "./target";
import { Type, VOID, INT, FLOAT, VoidType, NumberType, IntType } from "./types";

export abstract class Token {
    readonly context: CompilerContext;
    readonly position: number;
    type!: Type;

    constructor(context: CompilerContext, position: number) {
        this.context = context;
        this.position = position;
    }

    abstract toString(): string;
    abstract setTypes(): void;

    emit(target: CodeWriter, isRoot = false): void {}
}

function expectBrackets(c: CompilerContext): Token | undefined {
    if (!c.lex.string("(")) {
        return;
    }

    c.lex.readWhitespace();

    let op = expectTernary(c) || expectBrackets(c);
    if (!op) {
        throw new Error(`Expected something after ( at ${c.lex.lineColumn(c.lex.position)}`);
    }

    c.lex.readWhitespace();

    if (!c.lex.string(")")) {
        throw new Error(`Expected closing ) at ${c.lex.lineColumn(c.lex.position)}`);
    }

    c.lex.readWhitespace();

    return op;
}

export class TernaryToken extends Token {
    constructor(context: CompilerContext, position: number, public op: Token, public trueOp: Token, public falseOp: Token) {
        super(context, position);
    }

    toString(): string {
        return `${this.op} ? ${this.trueOp} : ${this.falseOp}`;
    }

    setTypes(): void {
        this.op.setTypes();
        this.trueOp.setTypes();
        this.falseOp.setTypes();
        if (this.op.type instanceof NumberType && this.op.type.constantValue !== undefined) {
            this.type = this.op.type.constantValue ? this.trueOp.type : this.falseOp.type;
        } else {
            this.type = new IntType();
        }
    }
    emit(code: CodeWriter) {
        if (this.type instanceof NumberType && this.type.constantValue !== undefined) {
            code.pushConst(this.type.constantValue);
            return;
        }

        this.op.emit(code);

        let jrzLocation = code.position;
        code.position += 2;

        this.trueOp.emit(code);
        let jrLocation = code.position;
        code.position += 2;

        let falseLocation = code.position;
        this.falseOp.emit(code);

        let save = code.position;
        code.position = jrzLocation;
        code.jrz(falseLocation - jrzLocation - 2);
        code.position = jrLocation;
        code.jr(save - jrLocation - 2);
        code.position = save;
    }
}

function expectTernary(c: CompilerContext): Token | undefined {
    let op = expectSum(c) || expectBrackets(c);
    if (!op) {
        return;
    }

    let position = c.lex.position;
    if (!c.lex.string("?")) {
        c.lex.position = position;
        return op;
    }

    c.lex.readWhitespace();

    let trueOp = expectTernary(c) || expectBrackets(c);
    if (!trueOp) {
        throw new Error(`Expected something after ?, at ${c.lex.lineColumn(position)}`);
    }

    if (!c.lex.string(":")) {
        throw new Error(`Expected : after ?, at ${c.lex.lineColumn(position)}`);
    }

    c.lex.readWhitespace();

    let falseOp = expectTernary(c) || expectBrackets(c);
    if (!falseOp) {
        throw new Error(`Expected something after :, at ${c.lex.lineColumn(position)}`);
    }

    c.lex.readWhitespace();

    return new TernaryToken(c, position, op, trueOp, falseOp);
}

export class MulToken extends Token {
    constructor(context: CompilerContext, position: number, public op1: Token, public op2: Token, public operator: "%" | "/" | "*") {
        super(context, position);
    }

    setTypes(): void {
        this.op1.setTypes();
        this.op2.setTypes();
        if (this.op1.type instanceof NumberType && this.op2.type instanceof NumberType) {
            switch (this.operator) {
                case "*":
                    this.type = this.op1.type.mul(this.op2.type);
                    break;
                case "/":
                    this.type = this.op1.type.div(this.op2.type);
                    break;
                case "%":
                    this.type = this.op1.type.mod(this.op2.type);
                    break;
                default:
                    throw new Error("Unimplemented");
            }
        } else {
            throw new Error(
                `Can only modulus/multiply/divide number values at ${this.context.lex.lineColumn(this.position)} (${this.op1.type.name}, ${
                    this.op2.type.name
                })`
            );
        }
    }

    toString() {
        return `${this.op1} ${this.operator} ${this.op2}`;
    }

    emit(code: CodeWriter) {
        if (this.type instanceof NumberType && this.type.constantValue !== undefined) {
            code.pushConst(this.type.constantValue);
        } else if (this.op1.type instanceof IntType && this.op2.type instanceof IntType) {
            if (this.op1.type.constantValue !== undefined) {
                code.pushConst(this.op1.type.constantValue);
            } else {
                this.op1.emit(code);
            }
            if (this.op2.type.constantValue !== undefined) {
                code.pushConst(this.op2.type.constantValue);
            } else {
                this.op2.emit(code);
            }
            switch (this.operator) {
                case "*":
                    code.mul();
                    break;
                case "/":
                    code.div();
                    break;
                case "%":
                    code.mod();
                    break;
            }
        } else {
            throw new Error(`Add/sub ${this.op1.type.name} and ${this.op2.type.name} not implemented`);
        }
    }
}

export function expectMul(c: CompilerContext): Token | undefined {
    let position = c.lex.position;
    let operand1 = expectValue(c) || expectBrackets(c);
    if (!operand1) {
        c.lex.position = position;
        return;
    }

    let type: "%" | "/" | "*";
    if (c.lex.string("*")) {
        type = "*";
    } else if (c.lex.string("/")) {
        type = "/";
    } else if (c.lex.string("%")) {
        type = "%";
    } else {
        return operand1;
    }

    c.lex.readWhitespace();

    let operand2 = expectMul(c) || expectBrackets(c);
    if (!operand2) {
        throw new Error(`Expected second operand for multiplication at ${c.lex.lineColumn()}`);
    }

    return new MulToken(c, position, operand1, operand2, type);
}

export class SumToken extends Token {
    constructor(context: CompilerContext, position: number, public op1: Token, public op2: Token, public operator: "+" | "-") {
        super(context, position);
    }

    setTypes(): void {
        this.op1.setTypes();
        this.op2.setTypes();
        if (this.op1.type instanceof NumberType && this.op2.type instanceof NumberType) {
            switch (this.operator) {
                case "+":
                    this.type = this.op1.type.add(this.op2.type);
                    break;
                case "-":
                    this.type = this.op1.type.sub(this.op2.type);
                    break;
                default:
                    throw new Error("Unimplemented");
            }
        } else {
            throw new Error(
                `Can only add/substract number values at ${this.context.lex.lineColumn(this.position)} (${this.op1.type.name}, ${this.op2.type.name})`
            );
        }
    }

    toString() {
        return `${this.op1} ${this.operator ? "+" : "-"} ${this.op2}`;
    }

    emit(code: CodeWriter) {
        if (this.type instanceof NumberType && this.type.constantValue !== undefined) {
            code.pushConst(this.type.constantValue);
        } else if (this.op1.type instanceof IntType && this.op2.type instanceof IntType) {
            if (this.op1.type.constantValue !== undefined) {
                code.pushConst(this.op1.type.constantValue);
            } else {
                this.op1.emit(code);
            }
            if (this.op2.type.constantValue !== undefined) {
                code.pushConst(this.op2.type.constantValue);
            } else {
                this.op2.emit(code);
            }
            switch (this.operator) {
                case "+":
                    code.add();
                    break;
                case "-":
                    code.sub();
                    break;
            }
        } else {
            throw new Error(`Add/sub ${this.op1.type.name} and ${this.op2.type.name} not implemented`);
        }
    }
}

export function expectSum(c: CompilerContext): Token | undefined {
    let position = c.lex.position;
    let operand1 = expectMul(c) || expectBrackets(c);
    if (!operand1) {
        c.lex.position = position;
        return;
    }

    let type: "+" | "-";
    if (c.lex.string("+")) {
        type = "+";
    } else if (c.lex.string("-")) {
        type = "-";
    } else {
        return operand1;
    }

    c.lex.readWhitespace();

    let operand2 = expectSum(c) || expectBrackets(c);
    if (!operand2) {
        throw new Error(`Expected second operand for sum at ${c.lex.lineColumn()}`);
    }

    return new SumToken(c, position, operand1, operand2, type);
}

export class ReferenceToken extends Token {
    constructor(context: CompilerContext, position: number, public varName: string) {
        super(context, position);
    }

    setTypes(): void {
        if (!this.context.vars.has(this.varName)) {
            throw new Error(`Unknown var '${this.varName}' at ${this.context.lex.lineColumn(this.position)}`);
        } else {
            this.type = this.context.vars.get(this.varName)!.type;
        }
    }

    toString() {
        return `var:${this.varName}`;
    }

    emit(code: CodeWriter): void {
        if (this.type instanceof IntType && this.type.constantValue !== undefined) {
            code.pushConst(this.type.constantValue!);
        } else {
            let address = this.context.vars.get(this.varName)!.location;
            code.push(address);
        }
    }
}

export function expectReference(c: CompilerContext) {
    let position = c.lex.position;

    let isStatic = c.lex.string("#");

    let varName = c.lex.readSymbol();
    if (!varName || "0123456789".includes(varName[0])) {
        c.lex.position = position;
        return;
    }

    c.lex.readWhitespace();

    return new ReferenceToken(c, position, varName);
}

export class ValueToken extends Token {
    constructor(context: CompilerContext, position: number, public value: string, public noInlining: boolean) {
        super(context, position);
    }

    setTypes(): void {
        this.type = new IntType(this.noInlining ? undefined : parseInt(this.value));
    }

    toString() {
        return `val:${this.value}`;
    }

    emit(code: CodeWriter) {
        code.pushConst(parseInt(this.value));
    }
}

export function expectValue(c: CompilerContext) {
    let position = c.lex.position;
    let ref = expectReference(c);
    if (ref) {
        return ref;
    }

    let value = c.lex.read("0123456789");
    if (!value) {
        c.lex.position = position;
        return;
    }

    let noInlining = c.lex.string("?");

    c.lex.readWhitespace();

    return new ValueToken(c, position, value, noInlining);
}

export class AssignmentToken extends Token {
    constructor(context: CompilerContext, position: number, public varName: string, public value: Token, public isStatic: boolean) {
        super(context, position);
    }

    setTypes(): void {
        this.value.setTypes();
        if (this.context.vars.has(this.varName)) {
            let v = this.context.vars.get(this.varName)!;
            // isAssignable(type, v.type)
            if (v instanceof VoidType) throw new Error(`Cannot assign void to ${v.type} at ${this.context.lex.lineColumn(this.position)}`);

            // Update type, can contain new constant value
            v.type = this.value.type;
        } else {
            let location = this.context.memorySize;
            this.context.memorySize += this.value.type.size;
            this.context.vars.set(this.varName, {
                location,
                name: this.varName,
                static: this.isStatic,
                type: this.value.type,
            });
        }
        this.type = this.value.type;
    }

    toString() {
        return `var:${this.varName} = ${this.value}`;
    }

    emit(code: CodeWriter, isRoot: boolean) {
        // if (!(this.value.type instanceof IntType && this.value.type.constantValue !== undefined)) {
        this.value.emit(code);
        let address = this.context.vars.get(this.varName)!.location;
        code.pop(address);
        if (!isRoot) {
            code.dup();
        }
        // }
    }
}

export function expectAssignment(c: CompilerContext) {
    let position = c.lex.position;

    let isStatic = c.lex.string("#");

    let varName = c.lex.readSymbol();
    if (!varName) {
        c.lex.position = position;
        return;
    }

    c.lex.readWhitespace();

    if (!c.lex.string("=")) {
        c.lex.position = position;
        return;
    }

    c.lex.readWhitespace();

    let value = expectTernary(c) || expectBrackets(c);
    if (!value) {
        throw new Error(`Value was expected after value declaration at ${c.lex.lineColumn()}`);
    }

    c.lex.readWhitespace();

    return new AssignmentToken(c, position, varName, value, isStatic);
}

export class BlockToken extends Token {
    constructor(context: CompilerContext, position: number, public statements: Token[]) {
        super(context, position);
    }

    setTypes(): void {
        this.statements.forEach((e) => e.setTypes());
        this.type = VOID;
    }

    toString() {
        return this.statements.map((e) => e.toString()).join("\n");
    }

    emit(code: CodeWriter) {
        this.statements.forEach((e) => e.emit(code, true));
    }
}

export function expectBlock(c: CompilerContext) {
    let position = c.lex.position;
    let statements: Token[] = [];

    while (c.lex.position < c.lex.buffer.length) {
        let s = expectOut(c) || expectAssignment(c);
        if (!s) {
            throw new Error(`Expected statement at ${c.lex.lineColumn()}`);
        }
        statements.push(s);
        c.lex.string(";");
        c.lex.readWhitespace();
    }

    return new BlockToken(c, position, statements);
}

export class OutToken extends Token {
    constructor(context: CompilerContext, position: number, public value: Token) {
        super(context, position);
    }

    toString(): string {
        return `out ${this.value.toString()}`;
    }
    setTypes(): void {
        this.value.setTypes();
        this.type = this.value.type;
    }

    emit(code: CodeWriter, isRoot: boolean) {
        this.value.emit(code);
        code.out();
        if (!isRoot) {
            code.dup();
        }
    }
}

export function expectOut(c: CompilerContext) {
    if (!c.lex.string("out ")) {
        return;
    }

    let position = c.lex.position;
    let op = expectTernary(c) || expectBrackets(c);
    if (!op) {
        throw new Error(`Expected operand for out statement at ${c.lex.lineColumn()}`);
    }

    return new OutToken(c, position, op);
}
