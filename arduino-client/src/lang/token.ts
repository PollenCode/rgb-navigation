import { CompilerContext } from "./compiler";
import { Lexer } from "./lexer";
import { CodeWriter } from "./target";
import { Type, VOID, INT, FLOAT, VoidType, NumberType, IntType } from "./types";

interface Location {
    address: number;
}

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

    emit(target: CodeWriter): Location | undefined {
        return;
    }
}

export class TernaryToken extends Token {
    constructor(context: CompilerContext, position: number, public op: Token, public trueOp: Token, public falseOp: Token) {
        super(context, position);
    }

    toString(): string {
        throw new Error("Method not implemented.");
    }

    setTypes(): void {
        this.op.setTypes();
        this.trueOp.setTypes();
        this.falseOp.setTypes();
        if (this.op.type instanceof NumberType && this.op.type.constantValue !== undefined) {
            this.type = this.op.type.constantValue ? this.trueOp.type : this.falseOp.type;
        } else {
            this.type = this.trueOp.type;
        }
    }
}

function expectTernary(c: CompilerContext): TernaryToken | SumToken | MulToken | ReferenceToken | ValueToken | undefined {
    let op = expectSum(c);
    if (!op) {
        return;
    }

    let position = c.lex.position;
    if (!c.lex.string("?")) {
        c.lex.position = position;
        return op;
    }

    c.lex.readWhitespace();

    let trueOp = expectTernary(c);
    if (!trueOp) {
        throw new Error(`Expected something after ?, at ${c.lex.lineColumn(position)}`);
    }

    if (!c.lex.string(":")) {
        throw new Error(`Expected : after ?, at ${c.lex.lineColumn(position)}`);
    }

    c.lex.readWhitespace();

    let falseOp = expectTernary(c);
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
        return undefined;
    }
}

export function expectMul(c: CompilerContext): MulToken | ReferenceToken | ValueToken | undefined {
    let position = c.lex.position;
    let operand1 = expectValue(c);
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

    let operand2 = expectMul(c);
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
        if (this.op1.type instanceof IntType && this.op2.type instanceof IntType) {
            if (this.op1.type.constantValue !== undefined) {
                // addconst t2, n
                let a2 = this.op2.emit(code)!;
                switch (this.op1.type.size) {
                    case 1:
                        code.addConst8(a2.address, this.op1.type.constantValue);
                        break;
                    case 2:
                        code.addConst16(a2.address, this.op1.type.constantValue);
                        break;
                    case 4:
                        code.addConst32(a2.address, this.op1.type.constantValue);
                        break;
                }
                return a2;
            } else if (this.op2.type.constantValue !== undefined) {
                // addconst t1, n
                let a1 = this.op1.emit(code)!;
                switch (this.op1.type.size) {
                    case 1:
                        code.addConst8(a1.address, this.op2.type.constantValue);
                        break;
                    case 2:
                        code.addConst16(a1.address, this.op2.type.constantValue);
                        break;
                    case 4:
                        code.addConst32(a1.address, this.op2.type.constantValue);
                        break;
                }
                return a1;
            } else {
                // add t1, t2
                let a1 = this.op1.emit(code)!;
                let a2 = this.op2.emit(code)!;
                switch (this.op1.type.size) {
                    case 1:
                        code.add(a1.address, a2.address);
                        break;
                    case 2:
                        code.add(a1.address, a2.address);
                        break;
                    case 4:
                        code.add(a1.address, a2.address);
                        break;
                }
            }
        } else {
            throw new Error(`Add/sub ${this.op1.type.name} and ${this.op2.type.name} not implemented`);
        }
    }
}

export function expectSum(c: CompilerContext): SumToken | MulToken | ReferenceToken | ValueToken | undefined {
    let position = c.lex.position;
    let operand1 = expectMul(c);
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

    let operand2 = expectSum(c);
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
    constructor(context: CompilerContext, position: number, public value: string) {
        super(context, position);
    }

    setTypes(): void {
        this.type = new IntType(parseInt(this.value));
    }

    toString() {
        return `val:${this.value}`;
    }
}

export function expectValue(c: CompilerContext) {
    let ref = expectReference(c);
    if (ref) {
        return ref;
    }

    let position = c.lex.position;
    let value = c.lex.read("0123456789");
    if (!value) {
        c.lex.position = position;
        return;
    }

    c.lex.readWhitespace();

    return new ValueToken(c, position, value);
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
            let location = this.context.currentVarLocation;
            this.context.currentVarLocation += this.value.type.size;
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

    let value = expectTernary(c);
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
}

export function expectBlock(c: CompilerContext) {
    let position = c.lex.position;
    let statements: Token[] = [];

    while (c.lex.position < c.lex.buffer.length) {
        let s = expectAssignment(c);
        if (!s) {
            throw new Error(`Expected statement at ${c.lex.lineColumn()}`);
        }
        statements.push(s);
        c.lex.string(";");
        c.lex.readWhitespace();
    }

    return new BlockToken(c, position, statements);
}
