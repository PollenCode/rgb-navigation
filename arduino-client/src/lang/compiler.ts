require("dotenv").config();
import fs from "fs/promises";
import debug from "debug";
import { Lexer } from "./lexer";
import { expectBlock } from "./token";

const logger = debug("rgb:lang");

async function compileFile(fileName: string) {
    logger(`compiling file ${fileName}`);
    compile(await fs.readFile(fileName, "utf-8"));
}

async function compile(input: string) {
    // input = await preprocess(input);

    let lex = new Lexer(input);
    lex.readWhitespace();

    let res = expectBlock(lex);
    console.log(res);
    console.log(res.toString());

    // logger(lex.readWhitespace().length);
    // logger(lex.string("#number"));
    // lex.readWhitespace();
    // logger(lex.string("="));
    // logger(lex.readSymbol());
}

compileFile("src/input.rgb");
