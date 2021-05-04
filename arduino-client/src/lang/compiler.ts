require("dotenv").config();
import fs from "fs/promises";
import debug from "debug";
import { Lexer } from "./lexer";
import { expectBlock, Token } from "./token";
import { IntType, NumberType, Type } from "./types";
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
    memorySize: number = 0;
    vars: Map<string, Variable>;
    root?: Token;

    constructor(input: string) {
        this.lex = new Lexer(input);
        this.lex.readWhitespace();
        this.vars = new Map();
    }

    getMemory() {
        let writer = new BinaryWriter();
        this.vars.forEach((e) => {
            writer.position = e.location;
            logger(`${e.name} -> 0x${e.location.toString(16)}`);
            let value = e.type instanceof NumberType && e.type.constantValue !== undefined ? e.type.constantValue : 0;
            switch (e.type.size) {
                case 1:
                    writer.write8(value);
                    break;
                case 2:
                    writer.write16(value);
                    break;
                case 4:
                    writer.write32(value);
                    break;
            }
        });
        return writer.buffer;
    }

    compile() {
        this.root = expectBlock(this);
    }

    typeCheck() {
        this.root!.setTypes();
    }

    getCode() {
        let writer = new CodeWriter();
        this.root!.emit(writer);
        return writer.buffer;
    }
}
export interface CompilerContext {
    vars: Map<string, Variable>;
}

async function compile(input: string) {
    // input = await preprocess(input);

    let context = new CompilerContext(input);
    context.vars.set("r", { type: new IntType(0), location: 0, static: true, name: "r" });
    context.vars.set("g", { type: new IntType(0), location: 4, static: true, name: "g" });
    context.vars.set("b", { type: new IntType(0), location: 8, static: true, name: "b" });
    context.memorySize = 12;

    logger("parsing...");
    context.compile();
    logger("type checking...");
    context.typeCheck();
    logger("compiling...");

    let memory = context.getMemory();
    let program = context.getCode();
    let buffer = Buffer.alloc(memory.length + program.length);
    memory.copy(buffer, 0, 0, memory.length);
    program.copy(buffer, memory.length, 0, program.length);

    logger(`program uses ${memory.length} bytes for variables, starting at 0`);
    logger(`program uses ${program.length} bytes for code, starting at ${memory.length}`);
    logger(`total size ${buffer.length} bytes`);

    console.log(buffer.toString("hex"));

    let outputFile = await fs.open("src/lang/interpreter/input.hex", "w");
    outputFile.write(buffer);
    await outputFile.close();
}

compileFile("src/input.rgb");
