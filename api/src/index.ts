import io from "socket.io-client";
import { TypedEmitter } from "tiny-typed-emitter";

export const isDevelopment = process.env.NODE_ENV === "development";
export const serverPath = isDevelopment ? "http://localhost:3001" : "";

interface Events {}

export class RGBNavigationClient extends TypedEmitter<Events> {
    private socket;

    constructor() {
        super();
        this.socket = io(serverPath);
    }
}

export * from "./message";
