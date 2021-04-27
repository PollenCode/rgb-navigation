import io from "socket.io-client";

export const isDevelopment = process.env.NODE_ENV === "development";
export const serverPath = isDevelopment ? "http://localhost:3001" : "";

class RgbNavigationClient {
    private socket;

    constructor() {
        this.socket = io();
    }
}

export * from "./message";
