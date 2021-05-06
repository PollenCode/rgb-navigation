export interface Type {
    readonly name: string;
    readonly size: number;
    isAssignableTo(other: Type): boolean;
}

export abstract class NumberType implements Type {
    abstract name: string;
    abstract size: number;
    constantValue?: number;

    constructor(constantValue?: number) {
        this.constantValue = constantValue;
    }

    abstract isAssignableTo(other: Type): boolean;

    abstract mul(other: NumberType): NumberType;
    abstract div(other: NumberType): NumberType;
    abstract sub(other: NumberType): NumberType;
    abstract add(other: NumberType): NumberType;
    abstract mod(other: NumberType): NumberType;
    abstract eq(other: NumberType): NumberType;
    abstract neq(other: NumberType): NumberType;
    abstract lt(other: NumberType): NumberType;
    abstract gt(other: NumberType): NumberType;
    abstract lte(other: NumberType): NumberType;
    abstract gte(other: NumberType): NumberType;
}

export class VoidType implements Type {
    name: string;
    size: number;

    constructor() {
        this.name = "void";
        this.size = 0;
    }

    isAssignableTo(other: Type): boolean {
        return false;
    }
}

export class FloatType extends NumberType {
    name: string;
    size: number;

    constructor(constantValue?: number) {
        super(constantValue);
        this.name = "float";
        this.size = 4;
    }

    isAssignableTo(other: Type): boolean {
        return other.name === this.name;
    }

    mul(other: NumberType): NumberType {
        return new FloatType(
            this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue * other.constantValue : undefined
        );
    }
    div(other: NumberType): NumberType {
        return new FloatType(
            this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue / other.constantValue : undefined
        );
    }
    sub(other: NumberType): NumberType {
        return new FloatType(
            this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue - other.constantValue : undefined
        );
    }
    add(other: NumberType): NumberType {
        return new FloatType(
            this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue + other.constantValue : undefined
        );
    }
    mod(other: NumberType): NumberType {
        return new FloatType(
            this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue % other.constantValue : undefined
        );
    }

    eq(other: NumberType): NumberType {
        return new IntType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue === other.constantValue ? 1 : 0) : undefined
        );
    }
    neq(other: NumberType): NumberType {
        return new IntType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue !== other.constantValue ? 1 : 0) : undefined
        );
    }
    lt(other: NumberType): NumberType {
        return new IntType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue < other.constantValue ? 1 : 0) : undefined
        );
    }
    gt(other: NumberType): NumberType {
        return new IntType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue > other.constantValue ? 1 : 0) : undefined
        );
    }
    lte(other: NumberType): NumberType {
        return new IntType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue <= other.constantValue ? 1 : 0) : undefined
        );
    }
    gte(other: NumberType): NumberType {
        return new IntType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue >= other.constantValue ? 1 : 0) : undefined
        );
    }
}

export class IntType extends NumberType {
    name: string;
    size: number;

    constructor(constantValue?: number, size = 4) {
        super(constantValue);
        this.name = "int";
        this.size = size;
    }

    isAssignableTo(other: Type): boolean {
        return other.name === this.name;
    }

    mul(other: NumberType): NumberType {
        if (other instanceof FloatType) {
            return new FloatType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue * other.constantValue : undefined
            );
        } else {
            return new IntType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue * other.constantValue : undefined
            );
        }
    }
    div(other: NumberType): NumberType {
        if (other instanceof FloatType) {
            return new FloatType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue / other.constantValue : undefined
            );
        } else {
            return new IntType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue / other.constantValue : undefined
            );
        }
    }
    sub(other: NumberType): NumberType {
        if (other instanceof FloatType) {
            return new FloatType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue - other.constantValue : undefined
            );
        } else {
            return new IntType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue - other.constantValue : undefined
            );
        }
    }
    add(other: NumberType): NumberType {
        if (other instanceof FloatType) {
            return new FloatType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue + other.constantValue : undefined
            );
        } else {
            return new IntType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue + other.constantValue : undefined
            );
        }
    }
    mod(other: NumberType): NumberType {
        if (other instanceof FloatType) {
            return new FloatType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue % other.constantValue : undefined
            );
        } else {
            return new IntType(
                this.constantValue !== undefined && other.constantValue !== undefined ? this.constantValue % other.constantValue : undefined
            );
        }
    }

    eq(other: NumberType): NumberType {
        return new IntType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue === other.constantValue ? 1 : 0) : undefined
        );
    }
    neq(other: NumberType): NumberType {
        return new IntType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue !== other.constantValue ? 1 : 0) : undefined
        );
    }
    lt(other: NumberType): NumberType {
        return new IntType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue < other.constantValue ? 1 : 0) : undefined
        );
    }
    gt(other: NumberType): NumberType {
        return new IntType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue > other.constantValue ? 1 : 0) : undefined
        );
    }
    lte(other: NumberType): NumberType {
        return new IntType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue <= other.constantValue ? 1 : 0) : undefined
        );
    }
    gte(other: NumberType): NumberType {
        return new IntType(
            this.constantValue !== undefined && other.constantValue !== undefined ? (this.constantValue >= other.constantValue ? 1 : 0) : undefined
        );
    }
}

export const VOID = new VoidType();
export const FLOAT = new FloatType();
export const INT = new IntType();
