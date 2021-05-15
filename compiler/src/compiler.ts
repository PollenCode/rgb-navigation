import fs from "fs/promises";
import debug from "debug";
import { Lexer } from "./lexer";
import { BlockToken, expectRoot, Token } from "./token";
import { IntType, Type } from "./types";
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

export class Scope {
    parent?: Scope;

    private vars = new Map<string, Var>();
    private knownValues = new Map<string, any>();
    private functions = new Map<string, Func>();

    constructor(parent?: Scope) {
        this.parent = parent;
    }

    hasVar(name: string) {
        return !!this.getVar(name);
    }

    getVar(name: string): Var | undefined {
        if (this.vars.has(name)) {
            return this.vars.get(name);
        } else if (this.parent) {
            return this.parent.getVar(name);
        } else {
            return undefined;
        }
    }

    defineVar(name: string, v: Omit<Var, "name">) {
        if (this.vars.has(name)) return false;
        this.vars.set(name, { ...v, name });
        return true;
    }

    hasFunc(name: string) {
        return !!this.getFunc(name);
    }

    getFunc(name: string): Func | undefined {
        if (this.functions.has(name)) {
            return this.functions.get(name);
        } else if (this.parent) {
            return this.parent.getFunc(name);
        } else {
            return undefined;
        }
    }

    defineFunc(name: string, f: Omit<Func, "name">) {
        if (this.functions.has(name)) return false;
        this.functions.set(name, { ...f, name });
        return true;
    }

    setVarKnownValue(name: string, value: any | undefined) {
        if (!this.vars.has(name)) throw new Error("Cannot set known value for unknown var");
        // Do not set on parent!
        if (value === undefined) this.knownValues.delete(name);
        else this.knownValues.set(name, value);
    }

    getVarKnownValue(name: string): any | undefined {
        if (this.knownValues.has(name)) {
            return this.knownValues.get(name)!;
        } else if (this.parent) {
            return this.parent.getVarKnownValue(name);
        } else {
            return undefined;
        }
    }
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
