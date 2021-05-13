import { BlockToken } from "./token";

export interface Target {
    compile(root: BlockToken): void;
}
