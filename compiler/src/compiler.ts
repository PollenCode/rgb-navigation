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

export interface Variable<L = unknown> {
    name: string;
    type: Type;
    /**
     * The assigned location of this variable
     */
    location?: L;
    /**
     * Whether this variable should not be affected by compiler optimizations
     */
    volatile: boolean;
}

export type Function =
    | {
          type: "function";
          name: string;
          returnType: Type;
          id: number;
          parameterCount: number;
      }
    | {
          type: "macro";
          name: string;
          returnType: Type;
          parameterCount: number;
          emitter: (output: CodeWriter) => void;
      };

export class CompilerContext {
    lex!: Lexer;
    vars: Map<string, Variable>;
    functions: Map<string, Function>;
    root?: BlockToken;

    constructor() {
        this.vars = new Map();
        this.functions = new Map();
    }

    /**
     * Defines builtin macros like sin, cos, tan ...
     */
    defineDefaultMacros() {
        this.defineMacro("sin", new IntType(), 1, (output) => {
            output.sin();
        });
        this.defineMacro("cos", new IntType(), 1, (output) => {
            output.cos();
        });
        // this.defineMacro("tan", new IntType(), 1, (output) => {
        //     output.tan();
        // });
        this.defineMacro("abs", new IntType(), 1, (output) => {
            output.abs();
        });
    }

    /**
     * Defines a function, with a fixed function id
     */
    defineFunction(name: string, callId: number, returnType: Type, parameterCount: number) {
        if (this.functions.has(name)) throw new Error("Function already declared");
        this.functions.set(name, { type: "function", id: callId, name, returnType, parameterCount });
    }

    /**
     * Defines a macro function
     */
    defineMacro(name: string, returnType: Type, parameterCount: number, emitter: (output: CodeWriter) => void) {
        if (this.functions.has(name)) throw new Error("Function already declared");
        this.functions.set(name, { type: "macro", emitter, name, returnType, parameterCount });
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
