require("dotenv").config();
import fs from "fs/promises";
import debug from "debug";
import { Lexer } from "./lexer";
import { expectBlock } from "./token";
import { Type } from "./types";
import { BinaryWriter, CodeWriter } from "./target";

const logger = debug("rgb:lang");

async function compileFile(fileName: string) {
    logger(`compiling file ${fileName}`);
    compile(await fs.readFile(fileName, "utf-8"));
}

interface Variable {
    static: boolean;
    name: string;
    type: Type;
    location: number;
}

export class CompilerContext {
    lex: Lexer;
    currentVarLocation: number = 0;
    vars: Map<string, Variable>;

    constructor(input: string) {
        this.lex = new Lexer(input);
        this.lex.readWhitespace();
        this.vars = new Map();
    }
}
export interface CompilerContext {
    vars: Map<string, Variable>;
}

async function compile(input: string) {
    // input = await preprocess(input);

    let context = new CompilerContext(input);

    let res = expectBlock(context);
    res.setTypes();
    console.log(res);
    let writer = new CodeWriter();
    res.emit(writer);
    console.log(writer.buffer.toString("hex"));

    let outputFile = await fs.open("src/lang/interpreter/input.hex", "w");
    outputFile.write(writer.buffer);
    await outputFile.close();

    // console.log(res.context.vars);

    // console.log(res.toString());
    // console.log(context.vars);

    // logger(lex.readWhitespace().length);
    // logger(lex.string("#number"));
    // lex.readWhitespace();
    // logger(lex.string("="));
    // logger(lex.readSymbol());
}

compileFile("src/input.rgb");
