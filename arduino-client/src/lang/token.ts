import { CompilerContext } from "./compiler";
import { Lexer } from "./lexer";

export type BuiltinType = "int" | "float" | "void";

export interface Token {
    toString(): string;
    resultingType(context: CompilerContext): BuiltinType;
}

export class MulToken implements Token {
    constructor(public op1: Token, public op2: Token, public type: "%" | "/" | "*") {}

    resultingType(context: CompilerContext): BuiltinType {
        return this.op1.resultingType(context) === "float" || this.op2.resultingType(context) === "float" ? "float" : "int";
    }

    toString() {
        return `${this.op1} ${this.type} ${this.op2}`;
    }
}

export function expectMul(c: CompilerContext): MulToken | ReferenceToken | ValueToken | undefined {
    let save = c.lex.position;
    let operand1 = expectValue(c);
    if (!operand1) {
        c.lex.position = save;
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

    return new MulToken(operand1, operand2, type);
}

export class SumToken implements Token {
    constructor(public op1: Token, public op2: Token, public type: "+" | "-") {}

    resultingType(context: CompilerContext): BuiltinType {
        return this.op1.resultingType(context) === "float" || this.op2.resultingType(context) === "float" ? "float" : "int";
    }

    toString() {
        return `${this.op1} ${this.type ? "+" : "-"} ${this.op2}`;
    }
}

export function expectSum(c: CompilerContext): SumToken | MulToken | ReferenceToken | ValueToken | undefined {
    let save = c.lex.position;
    let operand1 = expectMul(c);
    if (!operand1) {
        c.lex.position = save;
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

    return new SumToken(operand1, operand2, type);
}

export class ReferenceToken implements Token {
    constructor(public varName: string) {}

    resultingType(context: CompilerContext): BuiltinType {
        return context.vars.get(this.varName)!.type;
    }

    toString() {
        return `var:${this.varName}`;
    }
}

export function expectReference(c: CompilerContext) {
    let save = c.lex.position;

    let isStatic = c.lex.string("#");

    let varName = c.lex.readSymbol();
    if (!varName || "0123456789".includes(varName[0])) {
        c.lex.position = save;
        return;
    }

    c.lex.readWhitespace();

    return new ReferenceToken(varName);
}

export class ValueToken implements Token {
    constructor(public value: string) {}

    resultingType(context: CompilerContext): BuiltinType {
        return "int";
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

    let value = c.lex.read("0123456789");
    if (!value) {
        return;
    }

    c.lex.readWhitespace();

    return new ValueToken(value);
}

export class AssignmentToken implements Token {
    constructor(public varName: string, public value: Token) {}

    resultingType(context: CompilerContext): BuiltinType {
        return this.value.resultingType(context);
    }

    toString() {
        return `var:${this.varName} = ${this.value}`;
    }
}

export function expectAssignment(c: CompilerContext) {
    let save = c.lex.position;

    let isStatic = c.lex.string("#");

    let varName = c.lex.readSymbol();
    if (!varName) {
        c.lex.position = save;
        return;
    }

    c.lex.readWhitespace();

    if (!c.lex.string("=")) {
        c.lex.position = save;
        return;
    }

    c.lex.readWhitespace();

    let value = expectSum(c);
    if (!value) {
        throw new Error(`Value was expected after value declaration at ${c.lex.lineColumn()}`);
    }

    c.lex.readWhitespace();

    let existing = c.vars.get(varName);
    if (c.vars.has(varName)) {
    }

    return new AssignmentToken(varName, value);
}

export class BlockToken implements Token {
    constructor(public statements: Token[]) {}

    resultingType(context: CompilerContext): BuiltinType {
        return "void";
    }

    toString() {
        return this.statements.map((e) => e.toString()).join("\n");
    }
}

export function expectBlock(c: CompilerContext) {
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

    return new BlockToken(statements);
}
