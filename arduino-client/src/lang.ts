require("dotenv").config();
import fs from "fs/promises";
import debug from "debug";

const logger = debug("rgb:lang");

async function compileFile(fileName: string) {
    compile(await fs.readFile(fileName, "utf-8"));
}

async function compile(input: string) {
    logger(input);
}

compileFile("src/input.rgb");
