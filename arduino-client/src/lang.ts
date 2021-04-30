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

function expectValue() {
    return false;
}

function expectAssignment(lex: Lexer) {
    let save = lex.position;

    let isStatic = lex.string("#");

    let varName = lex.readSymbol();
    if (varName.length <= 0) {
        lex.position = save;
        return false;
    }

    lex.readWhitespace();

    if (!lex.string("=")) {
        lex.position = save;
        console.log("no =");
        return false;
    }

    lex.readWhitespace();

    if (!expectValue()) {
        throw new Error("Value was expected after value declaration");
    }

    lex.readWhitespace();

    return true;
}

async function compile(input: string) {
    // input = await preprocess(input);

    let lex = new Lexer(input);

    lex.readWhitespace();
    console.log(lex.buffer[lex.position]);

    while (lex.position < lex.buffer.length) {
        if (!expectAssignment(lex)) {
            throw new Error(`Expected assignment at ${lex.lineColumn()}`);
        }
    }

    // logger(lex.readWhitespace().length);
    // logger(lex.string("#number"));
    // lex.readWhitespace();
    // logger(lex.string("="));
    // logger(lex.readSymbol());
}

compileFile("src/input.rgb");
