import jsonwebtoken from "jsonwebtoken";
import querystring from "querystring";
import { isDevelopment } from "./helpers";

export function createUserAccessToken(userId: string) {
    return jsonwebtoken.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: 60 * 60 });
}

export function createToken(tokenId: string) {
    return jsonwebtoken.sign({ tokenId }, process.env.JWT_SECRET!, { expiresIn: 60 * 60 });
}

export function validateUserAccessToken(token: string) {
    try {
        return jsonwebtoken.verify(token, process.env.JWT_SECRET!) as { userId: string; tokenId: string };
    } catch (ex) {
        console.error("could not verify user jwt", ex, token);
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
        console.error("could not verify device jwt", ex, token);
        return null;
    }
}

export function getOAuthUrl() {
    let options = {
        redirect_uri: `${isDevelopment ? "http://localhost:3001/api/oauth/complete" : process.env.OAUTH_REDIRECT}`,
        client_id: process.env.OAUTH_CLIENT_ID,
        access_type: "offline",
        response_type: "code",
        prompt: "consent",
        state: "hello",
        scope: ["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"].join(" "),
    };
    return `https://accounts.google.com/o/oauth2/v2/auth?${querystring.stringify(options)}`;
}

// console.log(createDeviceAccessToken("dgang"));
