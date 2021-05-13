process.env.DEBUG = "rgb:*";
import debug from "debug";
import fs from "fs/promises";
import { ByteType, CompilerContext, IntType, ByteCodeInterpreter } from "../src";
import { ByteCodeTarget } from "../src/target/bytecode";

const logger = debug("rgb:compiler-test");

async function compileFile(fileName: string) {
    logger(`compiling file ${fileName}`);
    compile(await fs.readFile(fileName, "utf-8"));
}

async function compile(input: string) {
    let context = new CompilerContext();
    let target = new ByteCodeTarget();

    target.defineDefaultMacros(context);
    // Define predefined variables at a fixed location in memory
    context.defineVariable("r", new ByteType(), true, target.allocateVariableAt(0, new ByteType()));
    context.defineVariable("g", new ByteType(), true, target.allocateVariableAt(1, new ByteType()));
    context.defineVariable("b", new ByteType(), true, target.allocateVariableAt(2, new ByteType()));
    context.defineVariable("index", new IntType(), true, target.allocateVariableAt(4, new IntType()));
    context.defineVariable("timer", new IntType(), true, target.allocateVariableAt(8, new IntType()));

    context.defineFunction("random", new ByteType(), 0, target.allocateFunction(0));

    logger("parsing...");
    context.parse(input);
    logger("type checking...");
    context.typeCheck();
    logger("compiling...");
    context.compile(target);

    let [entryPoint, linked] = target.getLinkedProgram(context);

    logger(`program uses ${entryPoint} bytes for variables, starting at 0`);
    logger(`program uses ${linked.length - entryPoint} bytes for code, starting at ${entryPoint}`);
    logger(`total size ${linked.length} bytes`);

    let str = linked.toString("hex");
    logger("hex output:", str);
    let parts = [];
    for (let i = 0; i < str.length; i += 2) {
        parts.push("0x" + str.substr(i, 2));
    }
    logger("c output", parts.join(", "));

    let outputFile = await fs.open("../arduino/testing/input.hex", "w");
    outputFile.write(linked);
    await outputFile.close();

    logger("interpreting...");

    let inter = new ByteCodeInterpreter(linked, entryPoint);
    inter.callHandlers.set(0, () => {
        inter.push(Math.floor(Math.random() * 256));
    });
    inter.debug = true;

    for (let i = 0; i < 1; i++) {
        inter.exePointer = entryPoint;
        while (inter.executeNext()) {}
    }

    logger("interpret done");
}

compileFile("testing/input.rgb");
