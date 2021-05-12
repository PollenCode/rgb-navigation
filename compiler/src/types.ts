export abstract class Type<C = any> {
    readonly name: string;
    readonly size: number;
    constantValue?: C;

    constructor(name: string, size: number, constantValue?: C) {
        this.name = name;
        this.size = size;
        this.constantValue = constantValue;
    }

    abstract mul(other: Type): Type;
    abstract div(other: Type): Type;
    abstract sub(other: Type): Type;
    abstract add(other: Type): Type;
    abstract mod(other: Type): Type;
    abstract eq(other: Type): Type;
    abstract neq(other: Type): Type;
    abstract lt(other: Type): Type;
    abstract gt(other: Type): Type;
    abstract lte(other: Type): Type;
    abstract gte(other: Type): Type;
    abstract assign(other: Type): Type | undefined;
    abstract clone(): Type;
}

export abstract class NumberType implements Type<number> {
    readonly name: string;
    readonly size: number;
    constantValue?: number;

    constructor(name: string, size: number, constantValue?: number) {
        this.name = name;
        this.size = size;
        this.constantValue = constantValue;
    }

    abstract mul(other: Type): Type;
    abstract div(other: Type): Type;
    abstract sub(other: Type): Type;
    abstract add(other: Type): Type;
    abstract mod(other: Type): Type;
    abstract assign(other: Type): Type | undefined;
    abstract clone(): Type;

    eq(other: Type): Type {
        return new IntType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue === other.constantValue ? 1 : 0) : undefined
        );
    }
    neq(other: Type): Type {
        return new IntType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue !== other.constantValue ? 1 : 0) : undefined
        );
    }
    lt(other: Type): Type {
        return new IntType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue < other.constantValue ? 1 : 0) : undefined
        );
    }
    gt(other: Type): Type {
        return new IntType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue > other.constantValue ? 1 : 0) : undefined
        );
    }
    lte(other: Type): Type {
        return new IntType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue <= other.constantValue ? 1 : 0) : undefined
        );
    }
    gte(other: Type): Type {
        return new IntType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue >= other.constantValue ? 1 : 0) : undefined
        );
    }
}

export class VoidType extends Type {
    constructor() {
        super("void", 0);
    }
    mul(other: Type<any>): Type<any> {
        throw new Error("Invalid operation on type 'void'.");
    }
    div(other: Type<any>): Type<any> {
        throw new Error("Invalid operation on type 'void'.");
    }
    sub(other: Type<any>): Type<any> {
        throw new Error("Invalid operation on type 'void'.");
    }
    add(other: Type<any>): Type<any> {
        throw new Error("Invalid operation on type 'void'.");
    }
    mod(other: Type<any>): Type<any> {
        throw new Error("Invalid operation on type 'void'.");
    }
    eq(other: Type<any>): Type<any> {
        throw new Error("Invalid operation on type 'void'.");
    }
    neq(other: Type<any>): Type<any> {
        throw new Error("Invalid operation on type 'void'.");
    }
    lt(other: Type<any>): Type<any> {
        throw new Error("Invalid operation on type 'void'.");
    }
    gt(other: Type<any>): Type<any> {
        throw new Error("Invalid operation on type 'void'.");
    }
    lte(other: Type<any>): Type<any> {
        throw new Error("Invalid operation on type 'void'.");
    }
    gte(other: Type<any>): Type<any> {
        throw new Error("Invalid operation on type 'void'.");
    }
    assign(other: Type<any>): Type<any> | undefined {
        return undefined;
    }
    clone(): Type<any> {
        return new VoidType();
    }
}

export class FloatType extends Type<number> {
    constructor(constantValue?: number) {
        super("float", 4, constantValue);
    }

    mul(other: Type): Type {
        return new FloatType(
            this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue * other.constantValue : undefined
        );
    }
    div(other: Type): Type {
        return new FloatType(
            this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue / other.constantValue : undefined
        );
    }
    sub(other: Type): Type {
        return new FloatType(
            this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue - other.constantValue : undefined
        );
    }
    add(other: Type): Type {
        return new FloatType(
            this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue + other.constantValue : undefined
        );
    }
    mod(other: Type): Type {
        return new FloatType(
            this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue % other.constantValue : undefined
        );
    }
    eq(other: Type): Type {
        return new ByteType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue === other.constantValue ? 1 : 0) : undefined
        );
    }
    neq(other: Type): Type {
        return new ByteType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue !== other.constantValue ? 1 : 0) : undefined
        );
    }
    lt(other: Type): Type {
        return new ByteType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue < other.constantValue ? 1 : 0) : undefined
        );
    }
    gt(other: Type): Type {
        return new ByteType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue > other.constantValue ? 1 : 0) : undefined
        );
    }
    lte(other: Type): Type {
        return new ByteType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue <= other.constantValue ? 1 : 0) : undefined
        );
    }
    gte(other: Type): Type {
        return new ByteType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue >= other.constantValue ? 1 : 0) : undefined
        );
    }
    assign(other: Type<any>): Type<any> | undefined {
        if (other instanceof FloatType) {
            return new FloatType(this.constantValue);
        }
    }
    clone() {
        return new FloatType(this.constantValue);
    }
}

export class ByteType extends NumberType {
    constructor(constantValue?: number) {
        super("byte", 1, constantValue !== undefined ? constantValue & 0xff : undefined);
    }

    mul(other: Type): Type {
        if (other instanceof FloatType) {
            return new FloatType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue * other.constantValue : undefined
            );
        } else if (other instanceof ByteType) {
            return new ByteType(
                this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue * other.constantValue) & 0xff : undefined
            );
        } else {
            return new IntType(
                this.constantValue !== undefined && other.constantValue !== undefined
                    ? (this.constantValue * other.constantValue) & 0xffffffff
                    : undefined
            );
        }
    }
    div(other: Type): Type {
        if (other instanceof FloatType) {
            return new FloatType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue / other.constantValue : undefined
            );
        } else if (other instanceof ByteType) {
            return new ByteType(
                this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue / other.constantValue) & 0xff : undefined
            );
        } else {
            return new IntType(
                this.constantValue !== undefined && other.constantValue !== undefined
                    ? (this.constantValue / other.constantValue) & 0xffffffff
                    : undefined
            );
        }
    }
    sub(other: Type): Type {
        if (other instanceof FloatType) {
            return new FloatType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue - other.constantValue : undefined
            );
        } else if (other instanceof ByteType) {
            return new ByteType(
                this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue - other.constantValue) & 0xff : undefined
            );
        } else {
            return new IntType(
                this.constantValue !== undefined && other.constantValue !== undefined
                    ? (this.constantValue - other.constantValue) & 0xffffffff
                    : undefined
            );
        }
    }
    add(other: Type): Type {
        if (other instanceof FloatType) {
            return new FloatType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue + other.constantValue : undefined
            );
        } else if (other instanceof ByteType) {
            return new ByteType(
                this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue + other.constantValue) & 0xff : undefined
            );
        } else {
            return new IntType(
                this.constantValue !== undefined && other.constantValue !== undefined
                    ? (this.constantValue + other.constantValue) & 0xffffffff
                    : undefined
            );
        }
    }
    mod(other: Type): Type {
        if (other instanceof FloatType) {
            return new FloatType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue % other.constantValue : undefined
            );
        } else if (other instanceof ByteType) {
            return new ByteType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue % other.constantValue & 0xff : undefined
            );
        } else {
            return new IntType(
                this.constantValue !== undefined && other.constantValue !== undefined
                    ? this.constantValue % other.constantValue & 0xffffffff
                    : undefined
            );
        }
    }
    clone() {
        return new ByteType(this.constantValue);
    }
    assign(other: Type<any>): Type<any> | undefined {
        if (other instanceof ByteType) {
            return new ByteType(this.constantValue);
        } else if (other instanceof IntType) {
            return new IntType(this.constantValue);
        }
    }
}

export class IntType extends NumberType {
    constructor(constantValue?: number) {
        super("int", 4, constantValue === undefined ? undefined : constantValue & 0xffffffff);
    }

    mul(other: Type): Type {
        if (other instanceof FloatType) {
            return new FloatType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue * other.constantValue : undefined
            );
        } else {
            return new IntType(
                this.constantValue !== undefined && other.constantValue !== undefined
                    ? (this.constantValue * other.constantValue) & 0xffffffff
                    : undefined
            );
        }
    }
    div(other: Type): Type {
        if (other instanceof FloatType) {
            return new FloatType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue / other.constantValue : undefined
            );
        } else {
            return new IntType(
                this.constantValue !== undefined && other.constantValue !== undefined
                    ? (this.constantValue / other.constantValue) & 0xffffffff
                    : undefined
            );
        }
    }
    sub(other: Type): Type {
        if (other instanceof FloatType) {
            return new FloatType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue - other.constantValue : undefined
            );
        } else {
            return new IntType(
                this.constantValue !== undefined && other.constantValue !== undefined
                    ? (this.constantValue - other.constantValue) & 0xffffffff
                    : undefined
            );
        }
    }
    add(other: Type): Type {
        if (other instanceof FloatType) {
            return new FloatType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue + other.constantValue : undefined
            );
        } else {
            return new IntType(
                this.constantValue !== undefined && other.constantValue !== undefined
                    ? (this.constantValue + other.constantValue) & 0xffffffff
                    : undefined
            );
        }
    }
    mod(other: Type): Type {
        if (other instanceof FloatType) {
            return new FloatType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue % other.constantValue : undefined
            );
        } else {
            return new IntType(
                this.constantValue !== undefined && other.constantValue !== undefined
                    ? this.constantValue % other.constantValue & 0xffffffff
                    : undefined
            );
        }
    }
    clone() {
        return new IntType(this.constantValue);
    }
    assign(other: Type<any>): Type<any> | undefined {
        if (other instanceof ByteType) {
            return new ByteType(this.constantValue);
        } else if (other instanceof IntType) {
            return new IntType(this.constantValue);
        }
    }
}
