export interface Type {
    readonly name: string;
    readonly size: number;
    isAssignableTo(other: Type): boolean;
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

export class FloatType implements Type {
    name: string;
    size: number;

    constructor() {
        this.name = "float";
        this.size = 4;
    }

    isAssignableTo(other: Type): boolean {
        return other.name === this.name;
    }
}

export class IntType implements Type {
    name: string;
    size: number;

    constructor() {
        this.name = "int";
        this.size = 2;
    }

    isAssignableTo(other: Type): boolean {
        return other.name === this.name;
    }
}

export const VOID = new VoidType();
export const FLOAT = new FloatType();
export const INT = new IntType();
