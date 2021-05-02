import { CompilerContext } from "./compiler";
import { Lexer } from "./lexer";
import { Type, VOID, INT, FLOAT, VoidType } from "./types";

export abstract class Token {
    readonly context: CompilerContext;
    readonly position: number;

    constructor(context: CompilerContext, position: number) {
        this.context = context;
        this.position = position;
    }

    abstract toString(): string;
    abstract resultingType(): Type;
    emit() {}
}

export class MulToken extends Token {
    constructor(context: CompilerContext, position: number, public op1: Token, public op2: Token, public type: "%" | "/" | "*") {
        super(context, position);
    }

    resultingType(): Type {
        if (this.op1.resultingType().name === "float" || this.op2.resultingType().name === "float") return FLOAT;
        else return INT;
    }

    toString() {
        return `${this.op1} ${this.type} ${this.op2}`;
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

    let operand2 = expectSum(c);
    if (!operand2) {
        throw new Error(`Expected second operand for sum at ${c.lex.lineColumn()}`);
    }

    return new MulToken(c, position, operand1, operand2, type);
}

export class SumToken extends Token {
    constructor(context: CompilerContext, position: number, public op1: Token, public op2: Token, public type: "+" | "-") {
        super(context, position);
    }

    resultingType(): Type {
        if (this.op1.resultingType().name === "float" || this.op2.resultingType().name === "float") return FLOAT;
        else return INT;
    }

    toString() {
        return `${this.op1} ${this.type ? "+" : "-"} ${this.op2}`;
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

    resultingType(): Type {
        if (!this.context.vars.has(this.varName)) {
            throw new Error(`Unknown var '${this.varName}' at ${this.context.lex.lineColumn(this.position)}`);
        } else {
            return this.context.vars.get(this.varName)!.type;
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

    resultingType(): Type {
        return INT;
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

    resultingType(): Type {
        let type = this.value.resultingType();
        if (this.context.vars.has(this.varName)) {
            let v = this.context.vars.get(this.varName)!;
            // isAssignable(type, v.type)
            if (v instanceof VoidType) throw new Error(`Cannot assign void to ${v.type} at ${this.context.lex.lineColumn(this.position)}`);
        } else {
            let location = this.context.currentVarLocation;
            this.context.currentVarLocation += type.size;
            this.context.vars.set(this.varName, { location, name: this.varName, static: this.isStatic, type: type });
        }
        return type;
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

    let value = expectSum(c);
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

    resultingType(): Type {
        this.statements.forEach((e) => e.resultingType());
        return VOID;
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
