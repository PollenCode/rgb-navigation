process.env.DEBUG = "rgb:*";
import debug from "debug";
import fs from "fs/promises";
import { ByteType, CompilerContext, IntType } from "../src";

const logger = debug("rgb:compiler-test");

async function compileFile(fileName: string) {
    logger(`compiling file ${fileName}`);
    compile(await fs.readFile(fileName, "utf-8"));
}

async function compile(input: string) {
    let context = new CompilerContext();
    context.defineVariableAt("r", new ByteType(), 0);
    context.defineVariableAt("g", new ByteType(), 1);
    context.defineVariableAt("b", new ByteType(), 2);
    context.defineVariableAt("index", new IntType(), 4);
    context.defineVariableAt("timer", new IntType(), 8);

    logger("parsing...");
    context.compile(input);
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

    let str = buffer.toString("hex");
    logger("output:", str);
    // let parts = [];
    // for (let i = 0; i < str.length; i += 2) {
    //     parts.push("0x" + str.substr(i, 2));
    // }
    // console.log(parts.join(", "));

    let outputFile = await fs.open("../arduino/testing/input.hex", "w");
    outputFile.write(buffer);
    await outputFile.close();
}

compileFile("testing/input.rgb");
