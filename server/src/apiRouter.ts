import { Router } from "express";
import { createApiKey, createDeviceAccessToken, createUserAccessToken, getOAuthUrl } from "./auth";
import { isDevelopment } from "./helpers";
import { withAuth as withAuth } from "./middleware";
import jsonwebtoken from "jsonwebtoken";
import { PrismaClient } from ".prisma/client";
import fetch from "node-fetch";
import { sendLedController, roomNumberToLine } from "./socketServer";
import debug from "debug";
import effectRouter from "./effectRouter";

const logger = debug("rgb:router");
const router = Router();
const prisma = new PrismaClient();

router.use(effectRouter);

router.get("/oauth", async (req, res, next) => {
    res.redirect(getOAuthUrl());
});

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

    res.redirect((isDevelopment ? "http://localhost:3000/oauth?s=" : "/oauth?s=") + createUserAccessToken(user.id));
});

router.get("/user/me", withAuth(false), (req, res, next) => {
    res.json({
        name: req.user.name,
        identifier: req.user.identifier,
        id: req.user.id,
        email: req.user.email,
        admin: req.user.admin,
    });
});

router.post("/user/unbind", withAuth(false), async (req, res, next) => {
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

router.get("/user", withAuth(true), async (req, res, next) => {
    let users = await prisma.user.findMany({});
    res.json({ status: "ok", users });
});

router.put("/user/admin", withAuth(true), async (req, res, next) => {
    let user = await prisma.user.update({
        where: {
            id: req.body.id,
        },
        data: {
            admin: true,
        },
    });
    res.json({ status: "ok", user });
});

router.delete("/user/admin", withAuth(true), async (req, res, next) => {
    let user = await prisma.user.update({
        where: {
            id: req.body.id,
        },
        data: {
            admin: false,
        },
    });
    res.json({ status: "ok", user });
});

router.post("/apikey", withAuth(true), async (req, res, next) => {
    let token = await prisma.token.create({
        data: {
            author: req.user ? { connect: { id: req.user.id } } : undefined,
        },
    });
    res.json({ status: "ok", token: createApiKey(token.id) });
});

router.get("/apikey", withAuth(true), async (req, res, next) => {
    let tokens = await prisma.token.findMany({});
    res.json({ status: "ok", tokens });
});

router.delete("/apikey", withAuth(true), async (req, res, next) => {
    let token = await prisma.token.delete({
        where: {
            id: req.body.id,
        },
    });
    res.json({ status: "ok", token });
});

router.get("/deviceToken", withAuth(true), async (req, res, next) => {
    res.json({
        status: "ok",
        deviceToken: createDeviceAccessToken("dgang"),
    });
});

export default router;
