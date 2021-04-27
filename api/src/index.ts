import io from "socket.io-client";
import { TypedEmitter } from "tiny-typed-emitter";
import { LedControllerServerMessage } from "./message";

export const isDevelopment = process.env.NODE_ENV === "development";
export const serverPath = isDevelopment ? "http://localhost:3001" : "";

export interface Auth {
    accessToken: string;
    id: string;
    name: string;
    email: string;
    identifier: string | null;
}

interface Events {
    auth: (auth: Auth | undefined) => void;
}

export class RGBClient extends TypedEmitter<Events> {
    public socket;
    public auth?: Auth;

    constructor(auth?: Auth) {
        super();
        this.socket = io(serverPath);
        this.setAuth(auth);
    }

    public setAuth(auth: Auth | undefined) {
        this.auth = auth;
        this.emit("auth", auth);
    }

    private async doFetch(path: string, method: string, body?: any) {
        let init: RequestInit = { method, headers: {} };
        if (this.auth) {
            (init.headers as any)["Authorization"] = `Bearer ${this.auth.accessToken}`;
        }
        if (body) {
            init.body = JSON.stringify(body);
            (init.headers as any)["Content-Type"] = "application/json";
        }

        let res = await fetch(serverPath + path, init);

        if (res.status === 401) {
            // Unauthorized, need to refresh token
            this.setAuth(undefined);
            return null;
        }

        if (res.headers.get("Content-Type") === "application/json") {
            return await res.json();
        }
    }

    public async unbind() {
        return await this.doFetch("/api/unbind", "POST");
    }

    public async sendIdleEffect(effect: number) {
        let req: LedControllerServerMessage = {
            type: "setIdleEffect",
            effect: effect,
        };
        return await this.doFetch("/api/leds", "POST", req);
    }

    public async sendRoom(room: number) {
        let req: LedControllerServerMessage = {
            type: "roomEffect",
            room: room,
        };
        return await this.doFetch("/api/leds", "POST", req);
    }
}

export * from "./message";
