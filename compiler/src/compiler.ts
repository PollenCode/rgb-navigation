import fs from "fs/promises";
import debug from "debug";
import { Lexer } from "./lexer";
import { expectProgram, Token } from "./token";
import { IntType, NumberType, Type } from "./types";
import { BinaryWriter, CodeWriter } from "./target";

const logger = debug("rgb:compiler");
interface Variable {
    name: string;
    type: Type;
    /**
     * The assigned location of this variable in memory
     */
    location: number;
    /**
     * Whether this variable may be removed by the compiler if it is not needed.
     */
    volatile: boolean;
}

function align4(n: number) {
    return (n & ~0x3) + 4;
}

export class CompilerContext {
    lex!: Lexer;
    vars: Map<string, Variable>;
    root?: Token;

    private currentVarAllocation: number = 0;

    constructor() {
        this.vars = new Map();
    }

    defineVariableAt(name: string, type: Type, address: number, volatile = false) {
        if (this.vars.has(name)) throw new Error("Variable already declared");
        this.vars.set(name, { name, location: address, type, volatile });
        if (address + type.size > this.currentVarAllocation) {
            this.currentVarAllocation = address + type.size;
        }
    }

    defineVariable(name: string, type: Type, volatile = false) {
        if (this.vars.has(name)) throw new Error("Variable already declared");
        this.vars.set(name, { name, location: this.currentVarAllocation, type, volatile });
        this.currentVarAllocation += type.size;
    }

    /**
     * Returns the prealloced variables and their initial value in buffer format
     */
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

    /**
     * Combines memory and bytecode into one buffer, returning the entryPoint and buffer
     */
    getLinked(): [number, Buffer] {
        let memory = this.getMemory();
        let program = this.getCode();
        let entryPoint = align4(memory.length);
        let buffer = Buffer.alloc(entryPoint + program.length);
        memory.copy(buffer, 0, 0, entryPoint);
        program.copy(buffer, entryPoint, 0, program.length);
        return [entryPoint, buffer];
    }

    compile(input: string) {
        this.lex = new Lexer(input);
        this.lex.readWhitespace();
        this.root = expectProgram(this);
    }

    typeCheck() {
        this.root!.setTypes();
    }

    /**
     * Generates bytecode, to be interpreted by the interpreter
     */
    getCode() {
        let writer = new CodeWriter();
        this.root!.emit(writer, true);
        writer.halt();
        return writer.buffer;
    }
}
