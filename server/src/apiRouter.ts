import { Router } from "express";
import { createUserAccessToken } from "./auth";
import { isDevelopment } from "./helpers";
import { withUser } from "./middleware";
import jsonwebtoken from "jsonwebtoken";
import { PrismaClient } from ".prisma/client";
import fetch from "node-fetch";
import { sendArduino } from "./socketServer";

let router = Router();
let prisma = new PrismaClient();

router.get("/oauth/complete", async (req, res, next) => {
    let code = req.query.code;
    if (!code || typeof code !== "string") {
        return res.status(400).json({ status: "error", error: "invalid code" });
    }

    // https://developers.google.com/identity/protocols/oauth2/web-server
    // https://developers.google.com/identity/protocols/oauth2/openid-connect
    let googleResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            code,
            client_id: process.env.OAUTH_CLIENT_ID,
            client_secret: process.env.OAUTH_CLIENT_SECRET,
            redirect_uri: isDevelopment ? "http://localhost:3001/api/oauth/complete" : process.env.OAUTH_REDIRECT,
            grant_type: "authorization_code",
        }),
    });

    if (!googleResponse.ok) {
        console.error("google returned token error", await googleResponse.text());
        return res.status(400).json({
            status: "error",
            error: "could not exchange tokens with google",
        });
    }

    let googleData = await googleResponse.json();
    let googleTokenData;
    try {
        googleTokenData = jsonwebtoken.decode(googleData.id_token);
        if (!googleTokenData || typeof googleTokenData !== "object") throw new Error("tokenData is null");
    } catch (ex) {
        console.error("invalid google token", ex);
        return res.status(500).json({ status: "error", error: "invalid google token" });
    }

    let user = await prisma.user.upsert({
        where: {
            id: googleTokenData.sub,
        },
        update: {
            email: googleTokenData.email,
            name: googleTokenData.name,
            token: googleData.refresh_token,
        },
        create: {
            id: googleTokenData.sub,
            email: googleTokenData.email,
            name: googleTokenData.name,
            token: googleData.refresh_token,
        },
    });

    let accessToken = createUserAccessToken(user.id);
    res.redirect((isDevelopment ? "http://localhost:3000/?s=" : "/?s=") + encodeURIComponent(accessToken));
});

router.post("/user", withUser(), (req, res, next) => {
    res.json({ status: "ok", user: req.user });
});

router.post("/unbind", withUser(), async (req, res, next) => {
    let user = await prisma.user.update({
        where: {
            id: req.user!.id,
        },
        data: {
            identifier: null,
        },
    });
    res.json({ status: "ok", user: user });
});

router.post("/leds", withUser(), async (req, res, next) => {
    let message = req.body;
    sendArduino(message);
});
export default router;

router.get("/users", async (req, res, next) => {
    let user = await prisma.user.findMany({});
    res.json({ status: "ok", user });
});
