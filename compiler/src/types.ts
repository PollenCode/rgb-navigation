// IntType.assign(ByteType) -> IntType
// ByteType.assign(IntType) -> IntType
export abstract class Type {
    readonly name: string;
    readonly size: number;

    constructor(name: string, size: number) {
        this.name = name;
        this.size = size;
    }

    abstract mul(other: Type): Type | undefined;
    abstract div(other: Type): Type | undefined;
    abstract sub(other: Type): Type | undefined;
    abstract add(other: Type): Type | undefined;
    abstract mod(other: Type): Type | undefined;
    abstract eq(other: Type): Type | undefined;
    abstract neq(other: Type): Type | undefined;
    abstract lt(other: Type): Type | undefined;
    abstract lte(other: Type): Type | undefined;

    abstract isAssignableTo(other: Type): boolean;
}

export class VoidType extends Type {
    constructor() {
        super("void", 0);
    }

    mul(other: Type): Type | undefined {
        throw new Error("Cannot mul void.");
    }
    div(other: Type): Type | undefined {
        throw new Error("Cannot div void.");
    }
    sub(other: Type): Type | undefined {
        throw new Error("Cannot sub void.");
    }
    add(other: Type): Type | undefined {
        throw new Error("Cannot add void.");
    }
    mod(other: Type): Type | undefined {
        throw new Error("Cannot mod void.");
    }
    eq(other: Type): Type | undefined {
        throw new Error("Cannot eq void.");
    }
    neq(other: Type): Type | undefined {
        throw new Error("Cannot neq void.");
    }
    lt(other: Type): Type | undefined {
        throw new Error("Cannot lt void.");
    }
    lte(other: Type): Type | undefined {
        throw new Error("Cannot lte void.");
    }
    isAssignableTo(other: Type) {
        return false;
    }
}

export class FloatType extends Type {
    constructor() {
        super("float", 4);
    }

    mul(other: Type): Type {
        return new FloatType();
    }
    div(other: Type): Type {
        return new FloatType();
    }
    sub(other: Type): Type {
        return new FloatType();
    }
    add(other: Type): Type {
        return new FloatType();
    }
    mod(other: Type): Type {
        return new FloatType();
    }
    eq(other: Type): Type | undefined {
        return new ByteType();
    }
    neq(other: Type): Type | undefined {
        return new ByteType();
    }
    lt(other: Type): Type | undefined {
        return new ByteType();
    }
    lte(other: Type): Type | undefined {
        return new ByteType();
    }
    isAssignableTo(other: Type) {
        return true;
    }
}

export class ByteType extends Type {
    constructor() {
        super("byte", 1);
    }

    private combine(other: Type): Type | undefined {
        if (other instanceof ByteType) {
            return new ByteType();
        } else if (other instanceof IntType) {
            return new IntType();
        } else if (other instanceof FloatType) {
            return new FloatType();
        } else {
            return undefined;
        }
    }

    mul(other: Type): Type | undefined {
        return this.combine(other);
    }
    div(other: Type): Type | undefined {
        return this.combine(other);
    }
    sub(other: Type): Type | undefined {
        return this.combine(other);
    }
    add(other: Type): Type | undefined {
        return this.combine(other);
    }
    mod(other: Type): Type | undefined {
        return this.combine(other);
    }
    eq(other: Type): Type | undefined {
        return new ByteType();
    }
    neq(other: Type): Type | undefined {
        return new ByteType();
    }
    lt(other: Type): Type | undefined {
        return new ByteType();
    }
    lte(other: Type): Type | undefined {
        return new ByteType();
    }
    isAssignableTo(other: Type): boolean {
        return true;
    }
}

export class IntType extends Type {
    constructor() {
        super("int", 4);
    }

    private combine(other: Type): Type | undefined {
        if (other instanceof ByteType || other instanceof IntType) {
            return new IntType();
        } else if (other instanceof FloatType) {
            return new FloatType();
        } else {
            return undefined;
        }
    }

    mul(other: Type): Type | undefined {
        return this.combine(other);
    }
    div(other: Type): Type | undefined {
        return this.combine(other);
    }
    sub(other: Type): Type | undefined {
        return this.combine(other);
    }
    add(other: Type): Type | undefined {
        return this.combine(other);
    }
    mod(other: Type): Type | undefined {
        return this.combine(other);
    }
    eq(other: Type): Type | undefined {
        return new ByteType();
    }
    neq(other: Type): Type | undefined {
        return new ByteType();
    }
    lt(other: Type): Type | undefined {
        return new ByteType();
    }
    lte(other: Type): Type | undefined {
        return new ByteType();
    }
    isAssignableTo(other: Type): boolean {
        return true;
    }
}
