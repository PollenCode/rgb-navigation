import { CompilerContext } from "./compiler";
import { Lexer } from "./lexer";
import { CodeWriter } from "./target/bytecode";
import { Type, VoidType, NumberType, IntType, FloatType, ByteType } from "./types";
import debug from "debug";

const info = debug("rgb:compiler");
const warning = debug("rgb:compiler:warning");
const error = debug("rgb:compiler:error");

const RESERVED_WORDS = ["if", "else", "halt"];

export enum TokenId {
    Block,
    Sum,
    Mul,
    Ternary,
    Reference,
    Call,
    Halt,
    If,
    Assignment,
    Value,
    Compare,
}

export abstract class Token {
    readonly id: TokenId;
    readonly context: CompilerContext;
    readonly position: number;
    type!: Type;

    constructor(id: TokenId, context: CompilerContext, position: number) {
        this.context = context;
        this.position = position;
        this.id = id;
    }

    abstract toString(): string;
    abstract setTypes(): void;
}

function expectBrackets(c: CompilerContext): Token | undefined {
    if (!c.lex.string("(")) {
        return;
    }

    c.lex.readWhitespace();

    let op = expectTernary(c) || expectBrackets(c);
    if (!op) {
        throw new Error(`Expected something after ( at ${c.lex.lineColumn(c.lex.position)}`);
    }

    c.lex.readWhitespace();

    if (!c.lex.string(")")) {
        throw new Error(`Expected closing ) at ${c.lex.lineColumn(c.lex.position)}`);
    }

    c.lex.readWhitespace();

    return op;
}

export class TernaryToken extends Token {
    constructor(context: CompilerContext, position: number, public op: Token, public trueOp: Token, public falseOp: Token) {
        super(TokenId.Ternary, context, position);
    }

    toString(): string {
        return `${this.op} ? ${this.trueOp} : ${this.falseOp}`;
    }

    setTypes(): void {
        this.op.setTypes();
        this.trueOp.setTypes();
        this.falseOp.setTypes();
        if (this.op.type instanceof NumberType && this.op.type.constantValue !== undefined) {
            this.type = this.op.type.constantValue ? this.trueOp.type : this.falseOp.type;
        } else {
            this.type = new IntType();
        }
    }
}

function expectTernary(c: CompilerContext): Token | undefined {
    let op = expectCompare(c) || expectBrackets(c);
    if (!op) {
        return;
    }

    let position = c.lex.position;
    if (!c.lex.string("?")) {
        c.lex.position = position;
        return op;
    }

    c.lex.readWhitespace();

    let trueOp = expectTernary(c) || expectBrackets(c);
    if (!trueOp) {
        throw new Error(`Expected something after ?, at ${c.lex.lineColumn(position)}`);
    }

    if (!c.lex.string(":")) {
        throw new Error(`Expected : after ?, at ${c.lex.lineColumn(position)}`);
    }

    c.lex.readWhitespace();

    let falseOp = expectTernary(c) || expectBrackets(c);
    if (!falseOp) {
        throw new Error(`Expected something after :, at ${c.lex.lineColumn(position)}`);
    }

    c.lex.readWhitespace();

    return new TernaryToken(c, position, op, trueOp, falseOp);
}

export class MulToken extends Token {
    constructor(context: CompilerContext, position: number, public op1: Token, public op2: Token, public operator: "%" | "/" | "*") {
        super(TokenId.Mul, context, position);
    }

    setTypes(): void {
        this.op1.setTypes();
        this.op2.setTypes();
        if (this.op1.type instanceof NumberType && this.op2.type instanceof NumberType) {
            switch (this.operator) {
                case "*":
                    this.type = this.op1.type.mul(this.op2.type);
                    break;
                case "/":
                    this.type = this.op1.type.div(this.op2.type);
                    break;
                case "%":
                    this.type = this.op1.type.mod(this.op2.type);
                    break;
                default:
                    throw new Error("Unimplemented");
            }
        } else {
            throw new Error(
                `Can only modulus/multiply/divide number values at ${this.context.lex.lineColumn(this.position)} (${this.op1.type.name}, ${
                    this.op2.type.name
                })`
            );
        }
    }

    toString() {
        return `${this.op1} ${this.operator} ${this.op2}`;
    }
}

export function expectMul(c: CompilerContext): Token | undefined {
    let position = c.lex.position;
    let operand1 = expectCall(c, true) || expectBrackets(c);
    if (!operand1) {
        c.lex.position = position;
        return;
    }

    let type: "%" | "/" | "*";
    if (c.lex.string("*")) {
        type = "*";
    } else if (c.lex.string("/")) {
        type = "/";
    } else if (c.lex.string("%")) {
        type = "%";
    } else {
        return operand1;
    }

    c.lex.readWhitespace();

    let operand2 = expectMul(c) || expectBrackets(c);
    if (!operand2) {
        throw new Error(`Expected second operand for multiplication at ${c.lex.lineColumn()}`);
    }

    return new MulToken(c, position, operand1, operand2, type);
}

export class SumToken extends Token {
    constructor(context: CompilerContext, position: number, public op1: Token, public op2: Token, public operator: "+" | "-") {
        super(TokenId.Sum, context, position);
    }

    setTypes(): void {
        this.op1.setTypes();
        this.op2.setTypes();
        if (this.op1.type instanceof NumberType && this.op2.type instanceof NumberType) {
            switch (this.operator) {
                case "+":
                    this.type = this.op1.type.add(this.op2.type);
                    break;
                case "-":
                    this.type = this.op1.type.sub(this.op2.type);
                    break;
                default:
                    throw new Error("Unimplemented");
            }
        } else {
            throw new Error(
                `Can only add/substract number values at ${this.context.lex.lineColumn(this.position)} (${this.op1.type.name}, ${this.op2.type.name})`
            );
        }
    }

    toString() {
        return `${this.op1} ${this.operator ? "+" : "-"} ${this.op2}`;
    }

    emit(code: CodeWriter) {}
}

export function expectSum(c: CompilerContext): Token | undefined {
    let position = c.lex.position;
    let operand1 = expectMul(c) || expectBrackets(c);
    if (!operand1) {
        c.lex.position = position;
        return;
    }

    let type: "+" | "-";
    if (c.lex.string("+")) {
        type = "+";
    } else if (c.lex.string("-")) {
        type = "-";
    } else {
        return operand1;
    }

    c.lex.readWhitespace();

    let operand2 = expectSum(c) || expectBrackets(c);
    if (!operand2) {
        throw new Error(`Expected second operand for sum at ${c.lex.lineColumn()}`);
    }

    return new SumToken(c, position, operand1, operand2, type);
}

export class ReferenceToken extends Token {
    constructor(context: CompilerContext, position: number, public varName: string) {
        super(TokenId.Reference, context, position);
    }

    setTypes(): void {
        if (!this.context.vars.has(this.varName)) {
            throw new Error(`Unknown var '${this.varName}' at ${this.context.lex.lineColumn(this.position)}`);
        } else {
            this.type = this.context.vars.get(this.varName)!.type;
        }
    }

    toString() {
        return `var:${this.varName}`;
    }
}

export function expectReference(c: CompilerContext): Token | undefined {
    let position = c.lex.position;

    let varName = c.lex.readSymbol();
    if (!varName || "0123456789".includes(varName[0]) || RESERVED_WORDS.includes(varName)) {
        c.lex.position = position;
        return expectValue(c);
    }

    c.lex.readWhitespace();
    return new ReferenceToken(c, position, varName);
}

export class ValueToken extends Token {
    constructor(context: CompilerContext, position: number, public value: string, public noInlining: boolean) {
        super(TokenId.Value, context, position);
    }

    setTypes(): void {
        let val = parseInt(this.value);
        if (val > 2147483647 || val < -2147483648) {
            throw new Error(`Integer too large at ${this.context.lex.lineColumn(this.position)}`);
        } else if (val > 127 || val < -128) {
            this.type = new IntType(this.noInlining ? undefined : val);
        } else {
            this.type = new ByteType(this.noInlining ? undefined : val);
        }
    }

    toString() {
        return `val:${this.value}`;
    }
}

export function expectValue(c: CompilerContext) {
    let position = c.lex.position;

    let value = c.lex.read("0123456789");
    if (!value) {
        c.lex.position = position;
        return;
    }

    let noInlining = c.lex.string("?");

    c.lex.readWhitespace();

    return new ValueToken(c, position, value, noInlining);
}

export class AssignmentToken extends Token {
    constructor(
        context: CompilerContext,
        position: number,
        public typeName: string | undefined,
        public varName: string,
        public value: Token | undefined
    ) {
        super(TokenId.Assignment, context, position);
    }

    setTypes(): void {
        if (this.value) {
            this.value.setTypes();
        }
        if (this.typeName) {
            // Define variable
            if (this.context.vars.has(this.varName)) {
                throw new Error(
                    `Variable ${this.varName} has already been declared, second declaration is at ${this.context.lex.lineColumn(this.position)}`
                );
            }

            let type;
            switch (this.typeName) {
                case "int":
                    type = new IntType();
                    break;
                case "byte":
                    type = new ByteType();
                    break;
                // case "float":
                //     type = new FloatType();
                //     break;
                default:
                    throw new Error(`Unknown variable type ${this.typeName} at ${this.context.lex.lineColumn(this.position)}`);
            }

            if (this.value) {
                if (this.value.type.size > type.size) {
                    warning(`data loss when assigning type ${this.value.type.name} to ${type.name} at ${this.context.lex.lineColumn(this.position)}`);
                }
                let a = this.value.type.assign(type);
                if (!a) {
                    throw new Error(
                        `Type ${this.value.type.name} is not assignable to ${type.name} at ${this.context.lex.lineColumn(this.position)}`
                    );
                }
                this.type = a;
            } else {
                this.type = type;
            }

            this.context.defineVariable(this.varName, this.type);
        } else {
            // Set variable
            if (!this.context.vars.has(this.varName)) {
                throw new Error(`Variable ${this.varName} was not found, at ${this.context.lex.lineColumn(this.position)}`);
            }

            let v = this.context.vars.get(this.varName)!;
            let a = this.value!.type.assign(v.type);
            if (!a) {
                throw new Error(`Type ${this.value!.type.name} is not assignable to ${v.type.name} at ${this.context.lex.lineColumn(this.position)}`);
            }
            v.type = a;
            this.type = a;
        }
    }

    toString() {
        return `var:${this.varName} = ${this.value}`;
    }
}

export function expectAssignment(c: CompilerContext) {
    let position = c.lex.position;

    let name0 = c.lex.readSymbol();
    if (!name0 || RESERVED_WORDS.includes(name0)) {
        c.lex.position = position;
        return;
    }
    c.lex.readWhitespace();

    let name1 = c.lex.readSymbol();
    if (RESERVED_WORDS.includes(name1)) {
        c.lex.position = position;
        return;
    }
    c.lex.readWhitespace();

    let eq = c.lex.string("=");
    if (!name1 && !eq) {
        // Assignment token must at least be `var = value;` or `type var;`
        c.lex.position = position;
        return;
    }

    let value: Token | undefined;
    if (eq) {
        c.lex.readWhitespace();

        value = expectTernary(c) || expectBrackets(c);
        if (!value) {
            throw new Error(`Value was expected after declaration at ${c.lex.lineColumn()}`);
        }
    }

    if (name1) {
        return new AssignmentToken(c, position, name0, name1, value);
    } else {
        return new AssignmentToken(c, position, undefined, name0, value);
    }
}

/**
 * A token that represents a block of code, potentially containing multiple statements.
 */
export class BlockToken extends Token {
    constructor(context: CompilerContext, position: number, public statements: Token[]) {
        super(TokenId.Block, context, position);
    }

    setTypes(): void {
        this.statements.forEach((e) => e.setTypes());
        this.type = new VoidType();
    }

    toString() {
        if (this.statements.length === 1) return `: ${this.statements[0]}`;
        else return `{\n${this.statements.map((e) => e.toString()).join("\n")}\n}\n`;
    }
}

export function expectRoot(c: CompilerContext) {
    let position = c.lex.position;
    let statements: Token[] = [];

    while (c.lex.position < c.lex.buffer.length) {
        let s = expectHalt(c);
        if (!s) {
            throw new Error(`Expected statement at ${c.lex.lineColumn()}`);
        }
        statements.push(s);
        c.lex.string(";");
        c.lex.readWhitespace();
    }

    return new BlockToken(c, position, statements);
}

export function expectBlock(c: CompilerContext) {
    let position = c.lex.position;
    let statements: Token[] = [];
    if (c.lex.string("{")) {
        c.lex.readWhitespace();

        let s: Token | undefined;
        do {
            s = expectHalt(c);
            if (s) statements.push(s);

            c.lex.string(";");
            c.lex.readWhitespace();
        } while (s);

        if (!c.lex.string("}")) {
            throw new Error(`Expected closing } at ${c.lex.lineColumn()}`);
        }

        c.lex.readWhitespace();
    } else {
        let s = expectHalt(c);
        if (!s) {
            throw new Error(`Expected statement after : at ${c.lex.lineColumn()}`);
        }

        c.lex.string(";");
        c.lex.readWhitespace();

        statements.push(s);
    }
    return new BlockToken(c, position, statements);
}

export class CompareToken extends Token {
    constructor(
        context: CompilerContext,
        position: number,
        public op1: Token,
        public op2: Token,
        public operator: "==" | "!=" | ">" | ">=" | "<" | "<="
    ) {
        super(TokenId.Compare, context, position);
    }

    toString(): string {
        return `${this.op1} ${this.operator} ${this.op2}`;
    }

    setTypes(): void {
        this.op1.setTypes();
        this.op2.setTypes();

        if (this.op1.type instanceof NumberType && this.op2.type instanceof NumberType) {
            switch (this.operator) {
                case "!=":
                    this.type = this.op1.type.neq(this.op2.type);
                    break;
                case "==":
                    this.type = this.op1.type.eq(this.op2.type);
                    break;
                case ">":
                    this.type = this.op1.type.gt(this.op2.type);
                    break;
                case ">=":
                    this.type = this.op1.type.gte(this.op2.type);
                    break;
                case "<":
                    this.type = this.op1.type.lt(this.op2.type);
                    break;
                case "<=":
                    this.type = this.op1.type.lte(this.op2.type);
                    break;
            }
        } else {
            this.type = new IntType();
        }
    }
}

function expectCompare(c: CompilerContext) {
    let position = c.lex.position;
    let op1 = expectSum(c) || expectBrackets(c);
    if (!op1) {
        return;
    }

    let operator: "==" | "!=" | ">" | ">=" | "<" | "<=";
    if (c.lex.string("===")) {
        throw new Error(`Use == instead of === at ${c.lex.lineColumn()}`);
    } else if (c.lex.string("!==")) {
        throw new Error(`Use != instead of !== at ${c.lex.lineColumn()}`);
    } else if (c.lex.string("==")) {
        operator = "==";
    } else if (c.lex.string("=")) {
        throw new Error(`Use double equals signs (==) instead of a single one (=) to compare values at ${c.lex.lineColumn()}`);
    } else if (c.lex.string("!=")) {
        operator = "!=";
    } else if (c.lex.string(">=")) {
        operator = ">=";
    } else if (c.lex.string(">")) {
        operator = ">";
    } else if (c.lex.string("<=")) {
        operator = "<=";
    } else if (c.lex.string("<")) {
        operator = "<";
    } else {
        return op1;
    }

    c.lex.readWhitespace();

    let op2 = expectSum(c) || expectBrackets(c);
    if (!op2) {
        throw new Error(`Expected value to compare against at ${c.lex.lineColumn()}`);
    }

    return new CompareToken(c, position, op1, op2, operator);
}

export class IfToken extends Token {
    constructor(context: CompilerContext, position: number, public condition: Token, public ifBlock: Token, public elseBlock: Token | undefined) {
        super(TokenId.If, context, position);
    }

    toString(): string {
        if (this.elseBlock) return `if ${this.condition} \n\t${this.ifBlock}\n else \n\t${this.elseBlock}\n`;
        else return `if ${this.condition} \n\t${this.ifBlock}\n`;
    }
    setTypes(): void {
        this.type = new VoidType();
        this.condition.setTypes();
        this.ifBlock.setTypes();
        this.elseBlock?.setTypes();
    }
    emit(code: CodeWriter): void {}
}

export function expectIf(c: CompilerContext) {
    let position = c.lex.position;
    if (!c.lex.string("if")) {
        return expectAssignment(c);
    }

    c.lex.readWhitespace();

    let condition = expectTernary(c) || expectBrackets(c);
    if (!condition) {
        throw new Error(`Expected if condition at ${c.lex.lineColumn()}`);
    }

    let ifBlock = expectBlock(c);
    if (!ifBlock) {
        throw new Error(`Expected code block after if at ${c.lex.lineColumn()}`);
    }

    let elseBlock: Token | undefined = undefined;
    if (c.lex.string("else")) {
        c.lex.readWhitespace();
        elseBlock = expectBlock(c);
        if (!elseBlock) {
            throw new Error(`Expected code block after else at ${c.lex.lineColumn()}`);
        }
    }

    return new IfToken(c, position, condition, ifBlock, elseBlock);
}

export class HaltToken extends Token {
    constructor(context: CompilerContext, position: number) {
        super(TokenId.Halt, context, position);
    }

    toString(): string {
        return "halt";
    }

    setTypes(): void {
        this.type = new VoidType();
    }
}

export function expectHalt(c: CompilerContext) {
    let position = c.lex.position;
    if (!c.lex.string("halt")) {
        return expectCall(c, false);
    }

    c.lex.readWhitespace();

    return new HaltToken(c, position);
}

export class CallToken extends Token {
    constructor(context: CompilerContext, position: number, public functionName: string, public parameters: Token[]) {
        super(TokenId.Call, context, position);
    }

    toString(): string {
        return `${this.functionName}()`;
    }

    setTypes(): void {
        let func = this.context.functions.get(this.functionName);
        if (!func) throw new Error(`Function '${this.functionName}' not found at ${this.context.lex.lineColumn(this.position)}`);
        this.type = func.returnType;
        if (this.parameters.length !== func.parameterCount) {
            throw new Error(
                `Expected ${func.parameterCount} parameters (got ${this.parameters.length}) for function call at ${this.context.lex.lineColumn(
                    this.position
                )}`
            );
        }
        this.parameters.forEach((e) => e.setTypes());
    }
}

export function expectCall(c: CompilerContext, inline: boolean) {
    let position = c.lex.position;

    let funcName = c.lex.readSymbol();
    if (!funcName || "0123456789".includes(funcName[0]) || RESERVED_WORDS.includes(funcName)) {
        c.lex.position = position;
        return inline ? expectReference(c) : expectIf(c);
    }

    c.lex.readWhitespace();

    if (!c.lex.string("(")) {
        c.lex.position = position;
        return inline ? expectReference(c) : expectIf(c);
    }

    c.lex.readWhitespace();

    let parameters: Token[] = [];

    let firstParam = expectTernary(c) || expectBrackets(c);
    if (firstParam) parameters.push(firstParam);

    while (c.lex.string(",")) {
        c.lex.readWhitespace();
        let param = expectTernary(c) || expectBrackets(c);
        if (!param) throw new Error(`Expected parameter at ${c.lex.lineColumn()}`);
        parameters.push(param);
    }

    if (!c.lex.string(")")) {
        throw new Error(`Expected closing ) after parameter list at ${c.lex.lineColumn(c.lex.position)}`);
    }

    c.lex.readWhitespace();

    return new CallToken(c, position, funcName, parameters);
}
