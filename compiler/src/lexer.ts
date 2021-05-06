const WHITESPACE = "\n\r\t ";
const SYMBOL = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";

export class Lexer {
    buffer: string;
    position: number = 0;

    constructor(buffer: string) {
        this.buffer = buffer;
    }

    read(allowed: string) {
        let saved = [];
        while (allowed.includes(this.buffer[this.position])) {
            saved.push(this.buffer[this.position]);
            this.position++;
        }
        return saved.join("");
    }

    readWhitespace() {
        for (; ; this.position++) {
            if (WHITESPACE.includes(this.buffer[this.position])) {
                continue;
            }
            if (this.buffer[this.position] === "/" && this.buffer[this.position + 1] === "/") {
                // Comment
                this.position += 2;
                while (this.buffer[this.position] !== "\n" && this.position < this.buffer.length) {
                    this.position++;
                }
                continue;
            }
            break;
        }
    }

    readSymbol() {
        return this.read(SYMBOL);
    }

    lineColumn(position: number = this.position) {
        let lines = this.buffer.split("\n");
        for (let c = 0, l = 0, i = 0; l < lines.length; c++, i++) {
            if (c >= lines[l].length) {
                c = -1;
                l++;
            }
            if (i >= position) {
                return [l + 1, c + 1];
            }
        }
        return [0, 0];
    }

    string(str: string) {
        for (let i = 0; i < str.length; i++) {
            if (this.buffer[this.position + i] !== str[i]) {
                return false;
            }
        }
        this.position += str.length;
        return true;
    }
}
