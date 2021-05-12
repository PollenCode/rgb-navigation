process.env.DEBUG = "rgb:*";
import debug from "debug";
import fs from "fs/promises";
import { ByteType, CompilerContext, IntType, Interpreter } from "../src";

const logger = debug("rgb:compiler-test");

async function compileFile(fileName: string) {
    logger(`compiling file ${fileName}`);
    compile(await fs.readFile(fileName, "utf-8"));
}

async function compile(input: string) {
    let context = new CompilerContext();
    context.defineVariableAt("r", new ByteType(), 0, true);
    context.defineVariableAt("g", new ByteType(), 1, true);
    context.defineVariableAt("b", new ByteType(), 2, true);
    context.defineVariableAt("index", new IntType(), 4, true);
    context.defineVariableAt("timer", new IntType(), 8, true);
    context.defineFunction("sin", new IntType(), 1);

    logger("parsing...");
    context.compile(input);
    logger("type checking...");
    context.typeCheck();
    logger("compiling...");

    let [entryPoint, linked] = context.getLinked();

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

    let inter = new Interpreter(linked, entryPoint);
    inter.callHandlers.set(0, () => {
        inter.push(Math.sin(inter.pop() / 100) * 100);
    });
    // inter.debug = true;
    inter.writeInt(12, 1000);

    for (let i = 0; i < 1; i++) {
        inter.exePointer = entryPoint;
        while (inter.executeNext()) {}
    }

    logger("interpret done");
}

compileFile("testing/input.rgb");
