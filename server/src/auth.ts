import jsonwebtoken from "jsonwebtoken";
import querystring from "querystring";
import { isDevelopment } from "./helpers";
import debug from "debug";
import crypto from "crypto";

const logger = debug("rgb:server:jwt");

export function createUserAccessToken(userId: string) {
    return jsonwebtoken.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: 60 * 60 });
}

export function createApiKey(tokenId: number) {
    return jsonwebtoken.sign({ tokenId }, process.env.JWT_SECRET!);
}

export function validateUserAccessToken(token: string) {
    try {
        return jsonwebtoken.verify(token, process.env.JWT_SECRET!) as { userId: string } | { tokenId: number };
    } catch (ex) {
        if (ex.message !== "jwt expired") logger("could not verify user jwt", ex, token);
        return null;
    }
}

export function createDeviceAccessToken(roomId: string) {
    return jsonwebtoken.sign({ roomId }, process.env.JWT_SECRET!);
}

export function validateDeviceAccessToken(token: string) {
    try {
        return jsonwebtoken.verify(token, process.env.JWT_SECRET!) as { roomId: string };
    } catch (ex) {
        if (ex.message !== "jwt expired") logger("could not verify device jwt", ex, token);
        return null;
    }
}

export function getGoogleOAuthUrl() {
    let options = {
        redirect_uri: `${isDevelopment ? "http://localhost:3001/api/oauth/complete" : process.env.GOOGLE_OAUTH_REDIRECT}`,
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
        access_type: "offline",
        response_type: "code",
        prompt: "consent",
        state: "hello", // TODO
        scope: ["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"].join(" "),
    };
    return `https://accounts.google.com/o/oauth2/v2/auth?${querystring.stringify(options)}`;
}

export function getKuOAuthUrl() {
    return `https://webwsp.aps.kuleuven.be/sap/bc/sec/oauth2/authorize?${querystring.stringify({
        response_type: "code",
        client_id: process.env.KU_OAUTH_CLIENT_ID!,
        redirect_uri: process.env.KU_OAUTH_REDIRECT!,
        scope: "ZC_EP_UURROOSTER_OAUTH_SRV_0001 ZC_EP_OPO_INFO_SRV_0001",
        state: crypto.randomBytes(36).toString("hex"),
    })}`;
}

// logger("device token", createDeviceAccessToken("dgang"));
