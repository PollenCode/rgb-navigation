import { Func, Scope, Var } from "./compiler";
import { Lexer } from "./lexer";
import { CodeWriter } from "./target/bytecode";
import { Type, VoidType, IntType, FloatType, ByteType } from "./types";
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
    readonly context: Lexer;
    readonly position: number;
    type!: Type;
    constantValue?: number;

    constructor(id: TokenId, context: Lexer, position: number) {
        this.context = context;
        this.position = position;
        this.id = id;
    }

    abstract toString(): string;
    abstract setTypes(scope: Scope): void;
}

function expectBrackets(c: Lexer): Token | undefined {
    if (!c.string("(")) {
        return;
    }

    c.readWhitespace();

    let op = expectTernary(c) || expectBrackets(c);
    if (!op) {
        throw new Error(`Expected something after ( at ${c.lineColumn(c.position)}`);
    }

    c.readWhitespace();

    if (!c.string(")")) {
        throw new Error(`Expected closing ) at ${c.lineColumn(c.position)}`);
    }

    c.readWhitespace();

    return op;
}

export class TernaryToken extends Token {
    constructor(context: Lexer, position: number, public condition: Token, public trueOp: Token, public falseOp: Token) {
        super(TokenId.Ternary, context, position);
    }

    toString(): string {
        return `${this.condition} ? ${this.trueOp} : ${this.falseOp}`;
    }

    setTypes(scope: Scope): void {
        this.condition.setTypes(scope);
        this.trueOp.setTypes(scope);
        this.falseOp.setTypes(scope);

        if (this.trueOp.type.isAssignableTo(this.falseOp.type)) {
            this.type = this.falseOp.type;
        } else if (this.falseOp.type.isAssignableTo(this.trueOp.type)) {
            this.type = this.trueOp.type;
        } else {
            throw new Error("Cannot use ternary with 2 unrelated types");
        }

        if (this.condition.constantValue !== undefined) {
            if (this.condition.constantValue === 0) {
                this.constantValue = this.falseOp.constantValue;
            } else {
                this.constantValue = this.trueOp.constantValue;
            }
        }
    }
}

function expectTernary(c: Lexer): Token | undefined {
    let op = expectCompare(c) || expectBrackets(c);
    if (!op) {
        return;
    }

    let position = c.position;
    if (!c.string("?")) {
        c.position = position;
        return op;
    }

    c.readWhitespace();

    let trueOp = expectTernary(c) || expectBrackets(c);
    if (!trueOp) {
        throw new Error(`Expected something after ?, at ${c.lineColumn(position)}`);
    }

    if (!c.string(":")) {
        throw new Error(`Expected : after ?, at ${c.lineColumn(position)}`);
    }

    c.readWhitespace();

    let falseOp = expectTernary(c) || expectBrackets(c);
    if (!falseOp) {
        throw new Error(`Expected something after :, at ${c.lineColumn(position)}`);
    }

    c.readWhitespace();

    return new TernaryToken(c, position, op, trueOp, falseOp);
}

export class MulToken extends Token {
    constructor(context: Lexer, position: number, public op1: Token, public op2: Token, public operator: "%" | "/" | "*") {
        super(TokenId.Mul, context, position);
    }

    setTypes(scope: Scope): void {
        this.op1.setTypes(scope);
        this.op2.setTypes(scope);

        switch (this.operator) {
            case "*":
                this.type = this.op1.type.mul(this.op2.type)!;
                break;
            case "/":
                this.type = this.op1.type.div(this.op2.type)!;
                break;
            case "%":
                this.type = this.op1.type.mod(this.op2.type)!;
                break;
            default:
                throw new Error();
        }

        if (this.op1.constantValue !== undefined && this.op2.constantValue !== undefined) {
            switch (this.operator) {
                case "*":
                    this.constantValue = this.op1.constantValue * this.op2.constantValue;
                    break;
                case "/":
                    this.constantValue = this.op1.constantValue / this.op2.constantValue;
                    break;
                case "%":
                    this.constantValue = this.op1.constantValue % this.op2.constantValue;
                    break;
                default:
                    throw new Error();
            }
        }

        if (!this.type) {
            throw new Error(
                `Cannot modulus/multiply/divide ${this.op1.type.name} and ${this.op2.type.name} at ${this.context.lineColumn(this.position)}`
            );
        }
    }

    toString() {
        return `${this.op1} ${this.operator} ${this.op2}`;
    }
}

export function expectMul(c: Lexer): Token | undefined {
    let position = c.position;
    let operand1 = expectCall(c, true) || expectBrackets(c);
    if (!operand1) {
        c.position = position;
        return;
    }

    let type: "%" | "/" | "*";
    if (c.string("*")) {
        type = "*";
    } else if (c.string("/")) {
        type = "/";
    } else if (c.string("%")) {
        type = "%";
    } else {
        return operand1;
    }

    c.readWhitespace();

    let operand2 = expectMul(c) || expectBrackets(c);
    if (!operand2) {
        throw new Error(`Expected second operand for multiplication at ${c.lineColumn()}`);
    }

    return new MulToken(c, position, operand1, operand2, type);
}

export class SumToken extends Token {
    constructor(context: Lexer, position: number, public op1: Token, public op2: Token, public operator: "+" | "-") {
        super(TokenId.Sum, context, position);
    }

    setTypes(scope: Scope): void {
        this.op1.setTypes(scope);
        this.op2.setTypes(scope);

        switch (this.operator) {
            case "+":
                this.type = this.op1.type.add(this.op2.type)!;
                break;
            case "-":
                this.type = this.op1.type.sub(this.op2.type)!;
                break;
            default:
                throw new Error();
        }

        if (this.op1.constantValue !== undefined && this.op2.constantValue !== undefined) {
            switch (this.operator) {
                case "+":
                    this.constantValue = this.op1.constantValue + this.op2.constantValue;
                    break;
                case "-":
                    this.constantValue = this.op1.constantValue - this.op2.constantValue;
                    break;
                default:
                    throw new Error();
            }
        }

        if (!this.type) {
            throw new Error(`Cannot add/substract ${this.op1.type.name} and ${this.op2.type.name} at ${this.context.lineColumn(this.position)}`);
        }
    }

    toString() {
        return `${this.op1} ${this.operator ? "+" : "-"} ${this.op2}`;
    }

    emit(code: CodeWriter) {}
}

export function expectSum(c: Lexer): Token | undefined {
    let position = c.position;
    let operand1 = expectMul(c) || expectBrackets(c);
    if (!operand1) {
        c.position = position;
        return;
    }

    let type: "+" | "-";
    if (c.string("+")) {
        type = "+";
    } else if (c.string("-")) {
        type = "-";
    } else {
        return operand1;
    }

    c.readWhitespace();

    let operand2 = expectSum(c) || expectBrackets(c);
    if (!operand2) {
        throw new Error(`Expected second operand for sum at ${c.lineColumn()}`);
    }

    return new SumToken(c, position, operand1, operand2, type);
}

export class ReferenceToken extends Token {
    variable!: Var;

    constructor(context: Lexer, position: number, public varName: string) {
        super(TokenId.Reference, context, position);
    }

    setTypes(scope: Scope): void {
        this.variable = scope.getVar(this.varName)!;
        if (!this.variable) throw new Error(`Unknown var '${this.varName}' at ${this.context.lineColumn(this.position)}`);
        this.type = this.variable.type;
        if (!this.variable.volatile) this.constantValue = scope.getVarKnownValue(this.varName);
    }

    toString() {
        return `var:${this.varName}`;
    }
}

export function expectReference(c: Lexer): Token | undefined {
    let position = c.position;

    let varName = c.readSymbol();
    if (!varName || "0123456789".includes(varName[0]) || RESERVED_WORDS.includes(varName)) {
        c.position = position;
        return expectValue(c);
    }

    c.readWhitespace();
    return new ReferenceToken(c, position, varName);
}

export class ValueToken extends Token {
    constructor(context: Lexer, position: number, public value: string, public noInlining: boolean) {
        super(TokenId.Value, context, position);
    }

    setTypes(): void {
        let val = parseInt(this.value);
        if (val > 2147483647 || val < -2147483648) {
            throw new Error(`Integer too large at ${this.context.lineColumn(this.position)}`);
        } else if (val > 255 || val < 0) {
            this.type = new IntType();
            this.constantValue = this.noInlining ? undefined : val;
        } else {
            this.type = new ByteType();
            this.constantValue = this.noInlining ? undefined : val;
        }
    }

    toString() {
        return `val:${this.value}`;
    }
}

export function expectValue(c: Lexer) {
    let position = c.position;

    let value = c.read("0123456789");
    if (!value) {
        c.position = position;
        return;
    }

    let noInlining = c.string("?");

    c.readWhitespace();

    return new ValueToken(c, position, value, noInlining);
}

export class AssignmentToken extends Token {
    variable!: Var;

    constructor(context: Lexer, position: number, public typeName: string | undefined, public varName: string, public value: Token | undefined) {
        super(TokenId.Assignment, context, position);
    }

    setTypes(scope: Scope): void {
        if (this.value) {
            this.value.setTypes(scope);
        }
        if (this.typeName) {
            // Define variable
            switch (this.typeName) {
                case "int":
                    this.type = new IntType();
                    break;
                case "byte":
                    this.type = new ByteType();
                    break;
                // case "float":
                //     type = new FloatType();
                //     break;
                default:
                    throw new Error(`Unknown variable type ${this.typeName} at ${this.context.lineColumn(this.position)}`);
            }

            if (scope.hasVar(this.varName)) {
                throw new Error(
                    `Variable ${this.varName} has already been declared, second declaration is at ${this.context.lineColumn(this.position)}`
                );
            }
            this.variable = scope.defineVar(this.varName, { type: this.type, volatile: false })!;

            if (this.value) {
                if (this.value.type.size > this.type.size) {
                    warning(
                        `Possible data loss when assigning type ${this.value.type.name} to ${this.type.name} at ${this.context.lineColumn(
                            this.position
                        )}`
                    );
                }
                if (!this.value.type.isAssignableTo(this.type)) {
                    throw new Error(
                        `Type ${this.value.type.name} is not assignable to ${this.type.name} at ${this.context.lineColumn(this.position)}`
                    );
                }
                this.constantValue = this.value.constantValue;
                scope.setVarKnownValue(this.varName, this.value.constantValue);
            }
        } else {
            // Set variable
            this.variable = scope.getVar(this.varName)!;
            if (!this.variable) {
                throw new Error(`Variable ${this.varName} was not found, at ${this.context.lineColumn(this.position)}`);
            }

            if (!this.value!.type.isAssignableTo(this.variable.type)) {
                throw new Error(
                    `Type ${this.value!.type.name} is not assignable to ${this.variable.type.name} at ${this.context.lineColumn(this.position)}`
                );
            }
            this.constantValue = this.value!.constantValue;
            scope.setVarKnownValue(this.varName, this.value!.constantValue);
        }
    }

    toString() {
        return `var:${this.varName} = ${this.value}`;
    }
}

export function expectAssignment(c: Lexer) {
    let position = c.position;

    let name0 = c.readSymbol();
    if (!name0 || RESERVED_WORDS.includes(name0)) {
        c.position = position;
        return;
    }
    c.readWhitespace();

    let name1 = c.readSymbol();
    if (RESERVED_WORDS.includes(name1)) {
        c.position = position;
        return;
    }
    c.readWhitespace();

    let eq = c.string("=");
    if (!name1 && !eq) {
        // Assignment token must at least be `var = value;` or `type var;`
        c.position = position;
        return;
    }

    let value: Token | undefined;
    if (eq) {
        c.readWhitespace();

        value = expectTernary(c) || expectBrackets(c);
        if (!value) {
            throw new Error(`Value was expected after declaration at ${c.lineColumn()}`);
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
    constructor(context: Lexer, position: number, public statements: Token[]) {
        super(TokenId.Block, context, position);
    }

    setTypes(scope: Scope): void {
        this.statements.forEach((e) => e.setTypes(scope));
        this.type = new VoidType();
    }

    toString() {
        if (this.statements.length === 1) return `: ${this.statements[0]}`;
        else return `{\n${this.statements.map((e) => e.toString()).join("\n")}\n}\n`;
    }
}

export function expectRoot(c: Lexer) {
    let position = c.position;
    let statements: Token[] = [];

    c.readWhitespace();

    while (c.position < c.buffer.length) {
        let s = expectHalt(c);
        if (!s) {
            throw new Error(`Expected statement at ${c.lineColumn()}`);
        }
        statements.push(s);
        c.string(";");
        c.readWhitespace();
    }

    return new BlockToken(c, position, statements);
}

export function expectBlock(c: Lexer) {
    let position = c.position;
    let statements: Token[] = [];
    if (c.string("{")) {
        c.readWhitespace();

        let s: Token | undefined;
        do {
            s = expectHalt(c);
            if (s) statements.push(s);

            c.string(";");
            c.readWhitespace();
        } while (s);

        if (!c.string("}")) {
            throw new Error(`Expected closing } at ${c.lineColumn()}`);
        }

        c.readWhitespace();
    } else {
        let s = expectHalt(c);
        if (!s) {
            throw new Error(`Expected statement after : at ${c.lineColumn()}`);
        }

        c.string(";");
        c.readWhitespace();

        statements.push(s);
    }
    return new BlockToken(c, position, statements);
}

export class CompareToken extends Token {
    constructor(context: Lexer, position: number, public op1: Token, public op2: Token, public operator: "==" | "!=" | ">" | ">=" | "<" | "<=") {
        super(TokenId.Compare, context, position);
    }

    toString(): string {
        return `${this.op1} ${this.operator} ${this.op2}`;
    }

    setTypes(scope: Scope): void {
        this.op1.setTypes(scope);
        this.op2.setTypes(scope);

        switch (this.operator) {
            case "!=":
                this.type = this.op1.type.neq(this.op2.type)!;
                break;
            case "==":
                this.type = this.op1.type.eq(this.op2.type)!;
                break;
            case ">":
                this.type = this.op2.type.lt(this.op1.type)!;
                break;
            case ">=":
                this.type = this.op2.type.lte(this.op1.type)!;
                break;
            case "<":
                this.type = this.op1.type.lt(this.op2.type)!;
                break;
            case "<=":
                this.type = this.op1.type.lte(this.op2.type)!;
                break;
            default:
                throw new Error();
        }

        if (this.op1.constantValue !== undefined && this.op2.constantValue !== undefined) {
            switch (this.operator) {
                case "!=":
                    this.constantValue = this.op1.constantValue !== this.op2.constantValue ? 1 : 0;
                    break;
                case "==":
                    this.constantValue = this.op1.constantValue === this.op2.constantValue ? 1 : 0;
                    break;
                case ">":
                    this.constantValue = this.op1.constantValue > this.op2.constantValue ? 1 : 0;
                    break;
                case ">=":
                    this.constantValue = this.op1.constantValue >= this.op2.constantValue ? 1 : 0;
                    break;
                case "<":
                    this.constantValue = this.op1.constantValue < this.op2.constantValue ? 1 : 0;
                    break;
                case "<=":
                    this.constantValue = this.op1.constantValue <= this.op2.constantValue ? 1 : 0;
                    break;
                default:
                    throw new Error();
            }
        }

        if (!this.type) {
            throw new Error(`Cannot compare ${this.op1.type.name} and ${this.op2.type.name} at ${this.context.lineColumn(this.position)}`);
        }
    }
}

function expectCompare(c: Lexer) {
    let position = c.position;
    let op1 = expectSum(c) || expectBrackets(c);
    if (!op1) {
        return;
    }

    let operator: "==" | "!=" | ">" | ">=" | "<" | "<=";
    if (c.string("===")) {
        throw new Error(`Use == instead of === at ${c.lineColumn()}`);
    } else if (c.string("!==")) {
        throw new Error(`Use != instead of !== at ${c.lineColumn()}`);
    } else if (c.string("==")) {
        operator = "==";
    } else if (c.string("=")) {
        throw new Error(`Use double equals signs (==) instead of a single one (=) to compare values at ${c.lineColumn()}`);
    } else if (c.string("!=")) {
        operator = "!=";
    } else if (c.string(">=")) {
        operator = ">=";
    } else if (c.string(">")) {
        operator = ">";
    } else if (c.string("<=")) {
        operator = "<=";
    } else if (c.string("<")) {
        operator = "<";
    } else {
        return op1;
    }

    c.readWhitespace();

    let op2 = expectSum(c) || expectBrackets(c);
    if (!op2) {
        throw new Error(`Expected value to compare against at ${c.lineColumn()}`);
    }

    return new CompareToken(c, position, op1, op2, operator);
}

export class IfToken extends Token {
    constructor(context: Lexer, position: number, public condition: Token, public ifBlock: Token, public elseBlock: Token | undefined) {
        super(TokenId.If, context, position);
    }

    toString(): string {
        if (this.elseBlock) return `if ${this.condition} \n\t${this.ifBlock}\n else \n\t${this.elseBlock}\n`;
        else return `if ${this.condition} \n\t${this.ifBlock}\n`;
    }

    setTypes(scope: Scope): void {
        this.type = new VoidType();
        this.condition.setTypes(scope);
        this.ifBlock.setTypes(new Scope(scope));
        this.elseBlock?.setTypes(new Scope(scope));
        this.constantValue = this.condition.constantValue;
    }
}

export function expectIf(c: Lexer) {
    let position = c.position;
    if (!c.string("if")) {
        return expectAssignment(c);
    }

    c.readWhitespace();

    let condition = expectTernary(c) || expectBrackets(c);
    if (!condition) {
        throw new Error(`Expected if condition at ${c.lineColumn()}`);
    }

    let ifBlock = expectBlock(c);
    if (!ifBlock) {
        throw new Error(`Expected code block after if at ${c.lineColumn()}`);
    }

    let elseBlock: Token | undefined = undefined;
    if (c.string("else")) {
        c.readWhitespace();
        elseBlock = expectBlock(c);
        if (!elseBlock) {
            throw new Error(`Expected code block after else at ${c.lineColumn()}`);
        }
    }

    return new IfToken(c, position, condition, ifBlock, elseBlock);
}

export class HaltToken extends Token {
    constructor(context: Lexer, position: number) {
        super(TokenId.Halt, context, position);
    }

    toString(): string {
        return "halt";
    }

    setTypes(): void {
        this.type = new VoidType();
    }
}

export function expectHalt(c: Lexer) {
    let position = c.position;
    if (!c.string("halt")) {
        return expectCall(c, false);
    }

    c.readWhitespace();

    return new HaltToken(c, position);
}

export class CallToken extends Token {
    function!: Func<unknown>;

    constructor(context: Lexer, position: number, public functionName: string, public parameters: Token[]) {
        super(TokenId.Call, context, position);
    }

    toString(): string {
        return `${this.functionName}()`;
    }

    setTypes(scope: Scope): void {
        this.function = scope.getFunc(this.functionName)!;
        if (!this.function) throw new Error(`Function '${this.functionName}' not found at ${this.context.lineColumn(this.position)}`);

        this.type = this.function.returnType;
        if (this.parameters.length !== this.function.parameterCount) {
            throw new Error(
                `Expected ${this.function.parameterCount} parameters (got ${this.parameters.length}) for function call at ${this.context.lineColumn(
                    this.position
                )}`
            );
        }
        this.parameters.forEach((e) => e.setTypes(scope));
    }
}

export function expectCall(c: Lexer, inline: boolean) {
    let position = c.position;

    let funcName = c.readSymbol();
    if (!funcName || "0123456789".includes(funcName[0]) || RESERVED_WORDS.includes(funcName)) {
        c.position = position;
        return inline ? expectReference(c) : expectIf(c);
    }

    c.readWhitespace();

    if (!c.string("(")) {
        c.position = position;
        return inline ? expectReference(c) : expectIf(c);
    }

    c.readWhitespace();

    let parameters: Token[] = [];

    let firstParam = expectTernary(c) || expectBrackets(c);
    if (firstParam) parameters.push(firstParam);

    while (c.string(",")) {
        c.readWhitespace();
        let param = expectTernary(c) || expectBrackets(c);
        if (!param) throw new Error(`Expected parameter at ${c.lineColumn()}`);
        parameters.push(param);
    }

    if (!c.string(")")) {
        throw new Error(`Expected closing ) after parameter list at ${c.lineColumn(c.position)}`);
    }

    c.readWhitespace();

    return new CallToken(c, position, funcName, parameters);
}
