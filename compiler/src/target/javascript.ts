import { Scope, Target } from "../compiler";
import {
    AssignmentToken,
    BlockToken,
    CallToken,
    CompareToken,
    HaltToken,
    IfToken,
    MulToken,
    ReferenceToken,
    SumToken,
    TernaryToken,
    Token,
    TokenId,
    ValueToken,
} from "../token";

export class JavascriptTarget implements Target {
    private buffer: string[] = [];
    private header: string[] = ['"use strict";\n'];

    get code() {
        return this.header.join("") + this.buffer.join("");
    }

    private compileToken(token: Token) {
        switch (token.id) {
            case TokenId.Ternary:
                return this.compileTernary(token as TernaryToken);
            case TokenId.Mul:
            case TokenId.Sum:
            case TokenId.Compare:
                return this.compile2Operands(token as MulToken | SumToken | CompareToken);
            case TokenId.Call:
                return this.compileCall(token as CallToken);
            case TokenId.Assignment:
                return this.compileAssignment(token as AssignmentToken);
            case TokenId.Halt:
                return this.compileHalt(token as HaltToken);
            case TokenId.If:
                return this.compileIf(token as IfToken);
            case TokenId.Reference:
                return this.compileReference(token as ReferenceToken);
            case TokenId.Value:
                return this.compileValue(token as ValueToken);
            case TokenId.Block:
                return this.compileBlock(token as BlockToken);
            default:
                throw new Error(`Token ${token.id} not implemented`);
        }
    }

    private compileReference(token: ReferenceToken) {
        this.buffer.push(token.varName);
    }

    private compileAssignment(token: AssignmentToken) {
        if (token.typeName) {
            this.header.push("let ");
            this.header.push(token.varName);
            this.header.push(";\n");
        }
        if (token.value && (token.constantValue === undefined || token.variable.volatile)) {
            this.buffer.push(token.varName);
            this.buffer.push("=");
            this.compileToken(token.value);
        }
    }

    private compileCall(token: CallToken) {
        this.buffer.push(token.functionName);
        this.buffer.push("(");
        for (let i = 0; i < token.function.parameterCount; i++) {
            if (i !== 0) this.buffer.push(",");
            this.compileToken(token.parameters[i]);
        }
        this.buffer.push(")");
    }

    private compileValue(token: ValueToken) {
        this.buffer.push(token.value);
    }

    private compileTernary(token: TernaryToken) {
        this.buffer.push("(");
        if (token.constantValue !== undefined) {
            this.buffer.push(token.constantValue.toString());
            return;
        }
        this.compileToken(token.condition);
        this.buffer.push("?");
        this.compileToken(token.trueOp);
        this.buffer.push(":");
        this.compileToken(token.falseOp);
        this.buffer.push(")");
    }

    private compile2Operands(token: MulToken | SumToken | CompareToken) {
        this.compileToken(token.op1);
        this.buffer.push(token.operator);
        this.compileToken(token.op2);
    }

    private compileIf(token: IfToken) {
        if (token.constantValue !== undefined) {
            if (token.constantValue === 0) {
                if (token.elseBlock) {
                    this.compileToken(token.elseBlock);
                }
            } else {
                this.compileToken(token.ifBlock);
            }
            return;
        }

        this.buffer.push("if(");
        this.compileToken(token.condition);
        this.buffer.push(")");
        this.compileToken(token.ifBlock);
        if (token.elseBlock) {
            this.buffer.push("else");
            this.compileToken(token.elseBlock);
        }
    }

    private compileBlock(token: BlockToken) {
        if (token.statements.length === 1) {
            this.compileToken(token.statements[0]);
            this.buffer.push(";");
        } else {
            this.buffer.push("{");
            token.statements.forEach((e) => {
                this.compileToken(e);
                this.buffer.push(";");
            });
            this.buffer.push("}");
        }
    }

    private compileHalt(token: HaltToken) {
        this.buffer.push("return;");
    }

    compile(root: BlockToken): void {
        this.compileToken(root);
    }
}
