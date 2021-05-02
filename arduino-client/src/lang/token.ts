import { Lexer } from "./lexer";

export interface Token {
    toString(): string;
}

export class MulToken implements Token {
    constructor(public op1: any, public op2: any, public type: "%" | "/" | "*") {}

    toString() {
        return `${this.op1} ${this.type} ${this.op2}`;
    }
}

export function expectMul(lex: Lexer): MulToken | ReferenceToken | ValueToken | undefined {
    let save = lex.position;
    let operand1 = expectValue(lex);
    if (!operand1) {
        lex.position = save;
        return;
    }

    let type: "%" | "/" | "*";
    if (lex.string("*")) {
        type = "*";
    } else if (lex.string("/")) {
        type = "/";
    } else if (lex.string("%")) {
        type = "%";
    } else {
        return operand1;
    }

    lex.readWhitespace();

    let operand2 = expectSum(lex);
    if (!operand2) {
        throw new Error(`Expected second operand for sum at ${lex.lineColumn()}`);
    }

    return new MulToken(operand1, operand2, type);
}

export class SumToken implements Token {
    constructor(public op1: any, public op2: any, public type: "+" | "-") {}

    toString() {
        return `${this.op1} ${this.type ? "+" : "-"} ${this.op2}`;
    }
}

export function expectSum(lex: Lexer): SumToken | MulToken | ReferenceToken | ValueToken | undefined {
    let save = lex.position;
    let operand1 = expectMul(lex);
    if (!operand1) {
        lex.position = save;
        return;
    }

    let type: "+" | "-";
    if (lex.string("+")) {
        type = "+";
    } else if (lex.string("-")) {
        type = "-";
    } else {
        return operand1;
    }

    lex.readWhitespace();

    let operand2 = expectSum(lex);
    if (!operand2) {
        throw new Error(`Expected second operand for sum at ${lex.lineColumn()}`);
    }

    return new SumToken(operand1, operand2, type);
}

export class ReferenceToken implements Token {
    constructor(public varName: string) {}

    toString() {
        return `var:${this.varName}`;
    }
}

export function expectReference(lex: Lexer) {
    let save = lex.position;

    let isStatic = lex.string("#");

    let varName = lex.readSymbol();
    if (!varName || "0123456789".includes(varName[0])) {
        lex.position = save;
        return;
    }

    lex.readWhitespace();

    return new ReferenceToken(varName);
}

export class ValueToken implements Token {
    constructor(public value: string) {}

    toString() {
        return `val:${this.value}`;
    }
}

export function expectValue(lex: Lexer) {
    let ref = expectReference(lex);
    if (ref) {
        return ref;
    }

    let value = lex.read("0123456789");
    if (!value) {
        return;
    }

    lex.readWhitespace();

    return new ValueToken(value);
}

export class AssignmentToken implements Token {
    constructor(public varName: string, public value: any) {}

    toString() {
        return `var:${this.varName} = ${this.value}`;
    }
}

export function expectAssignment(lex: Lexer) {
    let save = lex.position;

    let isStatic = lex.string("#");

    let varName = lex.readSymbol();
    if (!varName) {
        lex.position = save;
        return;
    }

    lex.readWhitespace();

    if (!lex.string("=")) {
        lex.position = save;
        return;
    }

    lex.readWhitespace();

    let value = expectSum(lex);
    if (!value) {
        throw new Error(`Value was expected after value declaration at ${lex.lineColumn()}`);
    }

    lex.readWhitespace();

    return new AssignmentToken(varName, value);
}

export class BlockToken implements Token {
    constructor(public statements: Token[]) {}

    toString() {
        return this.statements.map((e) => e.toString()).join("\n");
    }
}

export function expectBlock(lex: Lexer) {
    let statements: Token[] = [];

    while (lex.position < lex.buffer.length) {
        let s = expectAssignment(lex);
        if (!s) {
            throw new Error(`Expected statement at ${lex.lineColumn()}`);
        }
        statements.push(s);
        lex.string(";");
        lex.readWhitespace();
    }

    return new BlockToken(statements);
}
