import { Router } from "express";
import { createApiKey, createDeviceAccessToken, createUserAccessToken, getGoogleOAuthUrl, getKuOAuthUrl } from "./auth";
import { isDevelopment } from "./helpers";
import { withAuth as withAuth, withValidator } from "./middleware";
import jsonwebtoken from "jsonwebtoken";
import { PrismaClient } from ".prisma/client";
import fetch from "node-fetch";
import { notifyLedController, roomNumberToLine } from "./socketServer";
import debug from "debug";
import effectRouter from "./effectRouter";
import tv, { SchemaType } from "typed-object-validator";

const logger = debug("rgb:router");
const router = Router();
const prisma = new PrismaClient();

router.use(effectRouter);

router.get("/oauth", async (req, res, next) => {
    res.redirect(getKuOAuthUrl());
});

router.get("/oauth/complete", async (req, res, next) => {
    res.json({
        body: req.body,
        query: req.query,
    });
});

router.get("/oauth/google", async (req, res, next) => {
    res.redirect(getGoogleOAuthUrl());
});

router.get("/oauth/google/complete", async (req, res, next) => {
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
            client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
            client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
            redirect_uri: isDevelopment ? "http://localhost:3001/api/oauth/google/complete" : process.env.GOOGLE_OAUTH_REDIRECT,
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

router.put("/user/:id/admin", withAuth(true), async (req, res, next) => {
    let userId = req.params.id;
    if (!userId) {
        return res.status(406);
    }

    let user = await prisma.user.update({
        where: {
            id: userId,
        },
        data: {
            admin: true,
        },
    });
    res.json({ status: "ok", user });
});

router.delete("/user/:id/admin", withAuth(true), async (req, res, next) => {
    let userId = req.params.id;
    if (!userId) {
        return res.status(406);
    }
    let user = await prisma.user.update({
        where: {
            id: userId,
        },
        data: {
            admin: false,
        },
    });
    res.json({ status: "ok", user });
});

const CreateApiKeyRequestSchema = tv.object({
    description: tv.string().min(1).max(100).optional(),
});

router.post("/apikey", withAuth(true), withValidator(CreateApiKeyRequestSchema), async (req, res, next) => {
    let data: SchemaType<typeof CreateApiKeyRequestSchema> = req.body;
    let token = await prisma.token.create({
        data: {
            description: data.description,
            author: req.user ? { connect: { id: req.user.id } } : undefined,
        },
    });
    res.json({ status: "ok", token: createApiKey(token.id) });
});

router.get("/apikey", withAuth(true), async (req, res, next) => {
    let tokens = await prisma.token.findMany({
        select: {
            author: {
                select: {
                    name: true,
                    email: true,
                    id: true,
                },
            },
            description: true,
            id: true,
            made: true,
        },
    });
    res.json({ status: "ok", tokens });
});

router.delete("/apikey/:id", withAuth(true), async (req, res, next) => {
    let id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(406);
    }
    let token = await prisma.token.delete({
        where: {
            id: id,
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
