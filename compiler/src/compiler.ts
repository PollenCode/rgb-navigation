import fs from "fs/promises";
import { Lexer } from "./lexer";
import { BlockToken, expectRoot, Token } from "./token";
import { Type } from "./types";

export interface Target {
    compile(root: BlockToken): void;
}

export interface Var<L = unknown> {
    name: string;
    type: Type;
    constant?: boolean;
    /**
     * The assigned location of this variable, this should be filled in by the target during its linking phase
     */
    location?: L;
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
    private funcs = new Map<string, Func>();

    get variables() {
        return this.vars as ReadonlyMap<string, Var>;
    }

    get functions() {
        return this.funcs as ReadonlyMap<string, Func>;
    }

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

    defineVar(name: string, v: Omit<Var, "name">): Var | undefined {
        if (this.vars.has(name)) return undefined;
        let vv = { ...v, name };
        this.vars.set(name, vv);
        return vv;
    }

    hasFunc(name: string) {
        return !!this.getFunc(name);
    }

    getFunc(name: string): Func | undefined {
        if (this.funcs.has(name)) {
            return this.funcs.get(name);
        } else if (this.parent) {
            return this.parent.getFunc(name);
        } else {
            return undefined;
        }
    }

    defineFunc(name: string, f: Omit<Func, "name">): Func | undefined {
        if (this.funcs.has(name)) return undefined;
        let ff = { ...f, name };
        this.funcs.set(name, ff);
        return ff;
    }

    setVarKnownValue(name: string, value: any | undefined) {
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

export function parseProgram(input: string) {
    let lexer = new Lexer(input);
    lexer.readWhitespace();
    return expectRoot(lexer);
}
