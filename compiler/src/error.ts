import { Lexer } from "./lexer";
import { Token } from "./token";

export class SyntaxError extends Error {
    constructor(message: string, public lexer: Lexer, public startPosition: number = lexer.position, public endPosition?: number) {
        super(message);
        this.name = "SyntaxError";
    }

    toString() {
        return `SyntaxError: ${this.message} (at ${this.lexer.lineColumn(this.startPosition).join(",")})`;
    }
}

export class TypeError extends Error {
    constructor(message: string, public token: Token) {
        super(message);
        this.name = "TypeError";
    }

    toString() {
        return `TypeError: ${this.message} (at ${this.token.context.lineColumn(this.token.startPosition).join(",")})`;
    }
}
