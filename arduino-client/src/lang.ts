require("dotenv").config();
import fs from "fs/promises";
import debug from "debug";

const WHITESPACE = "\n\r\t ";
const SYMBOL = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";

class Lexer {
    buffer: string;
    position: number = 0;

    constructor(buffer: string) {
        this.buffer = buffer;
    }

    read(allowed: string) {
        let saved = [];
        while (allowed.includes(this.buffer[this.position])) {
            saved.push(this.buffer[this.position]);
            this.position++;
        }
        return saved.join("");
    }

    readWhitespace() {
        for (; ; this.position++) {
            if (WHITESPACE.includes(this.buffer[this.position])) {
                continue;
            }
            if (this.buffer[this.position] === "/" && this.buffer[this.position + 1] === "/") {
                // Comment
                this.position += 2;
                while (this.buffer[this.position] !== "\n" && this.position < this.buffer.length) {
                    this.position++;
                }
                continue;
            }
            break;
        }
    }

    readSymbol() {
        return this.read(SYMBOL);
    }

    lineColumn(position: number = this.position) {
        let lines = this.buffer.split("\n");
        for (let c = 0, l = 0, i = 0; l < lines.length; c++, i++) {
            if (c >= lines[l].length) {
                c = -1;
                l++;
            }
            if (i >= position) {
                return [l + 1, c + 1];
            }
        }
        return [0, 0];
    }

    string(str: string) {
        for (let i = 0; i < str.length; i++) {
            if (this.buffer[this.position + i] !== str[i]) {
                return false;
            }
        }
        this.position += str.length;
        return true;
    }
}

const logger = debug("rgb:lang");

async function compileFile(fileName: string) {
    compile(await fs.readFile(fileName, "utf-8"));
}

interface Token {
    toString(): string;
}

class SumToken implements Token {
    constructor(public op1: any, public op2: any, public isPlus: boolean) {}

    toString() {
        return `${this.op1} ${this.isPlus ? "+" : "-"} ${this.op2}`;
    }
}

function expectSum(lex: Lexer): SumToken | ReferenceToken | ValueToken | undefined {
    let save = lex.position;
    let operand1 = expectValue(lex);
    if (!operand1) {
        lex.position = save;
        return;
    }

    let isPlus;
    if (lex.string("+")) {
        isPlus = true;
    } else if (lex.string("-")) {
        isPlus = false;
    } else {
        return operand1;
    }

    lex.readWhitespace();

    let operand2 = expectSum(lex);
    if (!operand2) {
        throw new Error(`Expected second operand for sum at ${lex.lineColumn()}`);
    }

    return new SumToken(operand1, operand2, isPlus);
}

class ReferenceToken implements Token {
    constructor(public varName: string) {}

    toString() {
        return `var:${this.varName}`;
    }
}

function expectReference(lex: Lexer) {
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

class ValueToken implements Token {
    constructor(public value: string) {}

    toString() {
        return `val:${this.value}`;
    }
}

function expectValue(lex: Lexer) {
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

class AssignmentToken implements Token {
    constructor(public varName: string, public value: any) {}

    toString() {
        return `var:${this.varName} = ${this.value}`;
    }
}

function expectAssignment(lex: Lexer) {
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

class BlockToken implements Token {
    constructor(public statements: Token[]) {}

    toString() {
        return this.statements.map((e) => e.toString()).join("\n");
    }
}

function expectBlock(lex: Lexer) {
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

async function compile(input: string) {
    // input = await preprocess(input);

    let lex = new Lexer(input);
    lex.readWhitespace();

    let res = expectBlock(lex);
    console.log(res.toString());

    // logger(lex.readWhitespace().length);
    // logger(lex.string("#number"));
    // lex.readWhitespace();
    // logger(lex.string("="));
    // logger(lex.readSymbol());
}

compileFile("src/input.rgb");
