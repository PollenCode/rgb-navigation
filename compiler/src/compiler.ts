import fs from "fs/promises";
import debug from "debug";
import { Lexer } from "./lexer";
import { BlockToken, expectRoot, Token } from "./token";
import { IntType, NumberType, Type } from "./types";
import { BinaryWriter, CodeWriter } from "./target/bytecode";

const logger = debug("rgb:compiler");

export interface Target {
    compile(root: BlockToken): void;
}

export interface Var<L = unknown> {
    name: string;
    type: Type;
    /**
     * The assigned location of this variable, this should be filled in by the target during its linking phase
     */
    location?: L;
    /**
     * Whether this variable should not be affected by compiler optimizations
     */
    volatile: boolean;
}

export interface Func<L = unknown> {
    name: string;
    returnType: Type;
    parameterCount: number;
    /**
     * The assigned location of this function, this should be filled in by the target during its linking phase
     */
    location?: L;
}

export class CompilerContext {
    lex!: Lexer;
    vars: Map<string, Var>;
    functions: Map<string, Func>;
    root?: BlockToken;

    constructor() {
        this.vars = new Map();
        this.functions = new Map();
    }

    /**
     * Defines a function, with a fixed function id
     */
    defineFunction<L = unknown>(name: string, returnType: Type, parameterCount: number, location?: L) {
        if (this.functions.has(name)) throw new Error("Function already declared");
        this.functions.set(name, { location, name, returnType, parameterCount });
    }

    /**
     * Defines a variable
     * @param type The type of the variable
     * @param volatile Whether this variable should not be affected by compiler optimizations
     * @param location The predefined location that should be compatible with the upcoming target, when left undefined, the target will fill it in
     */
    defineVariable<L = unknown>(name: string, type: Type, volatile = false, location?: L) {
        if (this.vars.has(name)) throw new Error("Variable already declared");
        this.vars.set(name, { name, type, volatile, location });
    }

    parse(input: string) {
        this.lex = new Lexer(input);
        this.lex.readWhitespace();
        this.root = expectRoot(this);
    }

    typeCheck() {
        this.root!.setTypes();
    }

    compile(target: Target) {
        target.compile(this.root!);
    }
}
