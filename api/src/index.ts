import io from "socket.io-client";
import { TypedEmitter } from "tiny-typed-emitter";
import { ArduinoBuildMessage, LedControllerServerMessage } from "./message";

export const isDevelopment = process.env.NODE_ENV === "development";
export const serverPath = isDevelopment ? "http://localhost:3001" : "";

export interface User {
    id: string;
    name: string;
    email: string;
    identifier: string | null;
}

interface Events {
    auth: (auth: User | undefined, accessToken: string | undefined) => void;
}

export class RGBClient extends TypedEmitter<Events> {
    public socket;
    public accessToken?: string;
    public user?: User;

    constructor(token?: string) {
        super();
        this.socket = io(serverPath);
        this.setAccessToken(token);
    }

    public async setAccessToken(token: string | undefined) {
        console.log("set");
        this.accessToken = token;
        if (token) {
            // Try to get the user
            let res = await fetch(serverPath + "/api/user", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (res.ok) {
                this.setUser(await res.json());
            } else {
                this.setUser(undefined);
            }
        } else {
            this.setUser(undefined);
        }
    }

    public setUser(user: User | undefined) {
        this.user = user;
        this.emit("auth", user, this.accessToken);
    }

    private async doFetch(path: string, method: string, body?: any) {
        let init: RequestInit = { method, headers: {} };
        if (this.accessToken) {
            (init.headers as any)["Authorization"] = `Bearer ${this.accessToken}`;
        }
        if (body) {
            init.body = JSON.stringify(body);
            (init.headers as any)["Content-Type"] = "application/json";
        }

        let res = await fetch(serverPath + path, init);

        if (res.status === 401) {
            // Unauthorized, need to refresh token
            this.setAccessToken(undefined);
            return null;
        }

        if (res.headers.get("Content-Type")?.includes("application/json")) {
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

    public async getEffects(code: boolean = false) {
        return await this.doFetch("/api/effect" + (code ? "?code=true" : ""), "GET");
    }

    public async getEffect(id: number) {
        return await this.doFetch("/api/effect/" + id, "GET");
    }

    public async deleteEffect(id: number) {
        return await this.doFetch("/api/effect/" + id, "DELETE");
    }

    public async createEffect(effect: { name: string; code: string }) {
        return await this.doFetch("/api/effect", "POST", effect);
    }

    public async updateEffect(effect: { name: string; code: string; id: number }) {
        return await this.doFetch("/api/effect", "PATCH", effect);
    }

    public async buildEffect(id: number) {
        return await this.doFetch("/api/effect/build/" + id, "POST");
    }

    public async emitArduinoBuild(message: ArduinoBuildMessage) {
        this.socket.emit("arduinoBuild", message);
    }
}

export * from "./message";
