import { throws } from "assert/strict";
import io from "socket.io-client";
import { TypedEmitter } from "tiny-typed-emitter";
import { IdeInfo, LedControllerServerMessage } from "./message";
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

export interface Effect {
    name: string;
    code: string;
    id: number;
    active?: boolean;
    lastError: string | null;
    author?: {
        id: string;
        name: string;
        email: string;
    };
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
            let res = await fetch(serverPath + "/api/user/me", {
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
        return await this.doFetch("/api/user/unbind", "POST");
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

    public async createEffect(effect: {
        name: string;
        code: string;
    }): Promise<{ status: "ok"; effect: Effect } | { status: "error"; error: string }> {
        return await this.doFetch("/api/effect", "POST", effect);
    }

    public async updateEffect(effect: { name: string; code: string; id: number }) {
        return await this.doFetch("/api/effect", "PATCH", effect);
    }

    public async buildEffect(id: number, upload: boolean = true): Promise<{ status: "error"; error: string } | { status: "ok" }> {
        return await this.doFetch(`/api/effect/${id}/build` + (upload ? "?upload=true" : ""), "POST");
    }

    public async setEffectVar(varName: string, value: number) {
        return await this.doFetch(`/api/effectVar/${varName}/${value}`, "POST");
    }

    public async enableLedRoomRoute(roomNumber: number) {
        return await this.doFetch("/api/roomRoute", "POST", {
            roomNumber: roomNumber,
        });
    }

    public async enableLedRoute(startLed: number, endLed: number, duration: number, color: string) {
        let c = hexToRgb(color)!;
        return await this.doFetch("/api/route", "POST", {
            duration: duration,
            startLed: startLed,
            endLed: endLed,
            r: c.r,
            g: c.g,
            b: c.b,
        });
    }

    public async createApiKey(): Promise<{ status: "ok"; token: any }> {
        return await this.doFetch("/api/apikey", "POST");
    }

    public async getApiKeys(): Promise<{ status: "ok"; tokens: any[] }> {
        return await this.doFetch("/api/apikey", "GET");
    }

    public async deleteApiKey(id: number) {
        return await this.doFetch("/api/apikey", "DELETE", {
            id: id,
        });
    }

    public async getUsers() {
        return await this.doFetch("/api/user", "GET");
    }

    public async giveAdmin(userId: number) {
        return await this.doFetch("/api/user/admin", "PUT", {
            id: userId,
        });
    }

    public async takeAdmin(userId: number) {
        return await this.doFetch("/api/user/admin", "DELETE", {
            id: userId,
        });
    }

    public async ideInfo(): Promise<IdeInfo> {
        return await this.doFetch("/api/ideInfo", "GET");
    }
}

export * from "./message";
