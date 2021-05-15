import { throws } from "assert/strict";
import io from "socket.io-client";
import { TypedEmitter } from "tiny-typed-emitter";
import { LedControllerServerMessage } from "./message";
import qs from "querystring";

export const isDevelopment = process.env.NODE_ENV === "development";
export const serverPath = isDevelopment ? "http://localhost:3001" : "https://rgb.ikdoeict.be";

export interface User {
    id: string;
    name: string;
    email: string;
    identifier: string | null;
    admin: boolean;
}

interface Events {
    auth: (auth: User | undefined, accessToken: string | undefined) => void;
}

function hexToRgb(hex: any) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : undefined;
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

    public async sendRoom(room: number) {
        let req: LedControllerServerMessage = {
            type: "roomEffect",
            room: room,
        };
        return await this.doFetch("/api/leds", "POST", req);
    }

    public async getEffects(code: boolean = false, onlyUser: boolean = false) {
        return await this.doFetch("/api/effect?" + qs.stringify({ code, onlyUser }), "GET");
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

    public async buildEffect(id: number, upload: boolean): Promise<{ status: "error"; error: string } | { status: "ok" }> {
        return await this.doFetch("/api/effect/build/" + id + (upload ? "?upload=true" : ""), "POST");
    }

    public async ledController(startLed: number, endLed: number, duration: number, color: string) {
        let c = hexToRgb(color)!;
        let req: LedControllerServerMessage = {
            type: "enableLine",
            duration: duration,
            startLed: startLed,
            endLed: endLed,
            r: c.r,
            g: c.g,
            b: c.b,
        };
        return await this.doFetch("/api/leds", "POST", req);
    }

    public async getToken() {
        return await this.doFetch("/api/createToken", "GET");
    }

    public async getTokens() {
        return await this.doFetch("/api/getTokens", "GET");
    }

    public async deleteToken(id: any) {
        let req = {
            id: id,
        };
        return await this.doFetch("/api/deleteToken", "DELETE", req);
    }

    public async getUsers() {
        return await this.doFetch("/api/users", "GET");
    }

    public async giveAdmin(user: any) {
        let req = {
            id: user.id,
        };
        return await this.doFetch("/api/giveAdmin", "PUT", req);
    }

    public async takeAdmin(user: any) {
        let req = {
            id: user.id,
        };
        return await this.doFetch("/api/takeAdmin", "PUT", req);
    }
}

export * from "./message";
