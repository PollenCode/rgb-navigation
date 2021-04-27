import { Router } from "express";
import { createUserAccessToken } from "./auth";
import { isDevelopment } from "./helpers";
import { withUser } from "./middleware";
import jsonwebtoken from "jsonwebtoken";
import { PrismaClient } from ".prisma/client";
import fetch from "node-fetch";
import { sendArduino } from "./socketServer";
import debug from "debug";

const logger = debug("rgb:router");
const router = Router();
const prisma = new PrismaClient();

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

router.get("/user", withUser(), (req, res, next) => {
    res.json({
        name: req.user.name,
        identifier: req.user.identifier,
        id: req.user.id,
        email: req.user.email,
    });
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

router.get("/effect", withUser(), async (req, res, next) => {
    let effects = await prisma.effect.findMany({
        select: {
            name: true,
            id: true,
            author: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
    });
    res.json(effects);
});

router.delete("/effect/:id", withUser(), async (req, res, next) => {
    let id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).end();
    }

    let effect = await prisma.effect.findUnique({
        where: {
            id: id,
        },
    });

    if (!effect) {
        logger("user %d tried to delete effect that doesn't exist (%d)", req.user!.id, id);
        return res.status(404).end();
    }
    if (effect.userId !== req.user!.id) {
        logger("user %d tried to delete effect that isn't his (%s)", req.user.id, effect.name);
        return res.status(403).end();
    }

    await prisma.effect.delete({
        where: {
            id: effect.id,
        },
    });

    res.end();
});

router.post("/effect", withUser(), async (req, res, next) => {
    let { code, name } = req.body;

    let existing = await prisma.effect.findUnique({
        where: {
            name,
        },
    });

    if (existing) {
        return res.status(400).end("effect with name already exists");
    }

    let effect = await prisma.effect.create({
        data: {
            name: name,
            code: code,
            author: {
                connect: {
                    id: req.user!.id,
                },
            },
        },
        select: {
            code: true,
            name: true,
            id: true,
            author: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
    });

    res.json(effect);
});

router.patch("/effect", withUser(), async (req, res, next) => {
    let { code, name, id } = req.body;

    let existing = await prisma.effect.findUnique({
        where: {
            id: id,
        },
    });

    if (!existing) {
        return res.status(404).end();
    }

    if (existing.userId !== req.user.id) {
        logger("user %d tried to update other user's effect (%s)", req.user.id, name);
        return res.status(403).end();
    }

    let effect = await prisma.effect.update({
        where: {
            id: existing.id,
        },
        data: {
            code: code,
            name: name,
        },
        select: {
            code: true,
            name: true,
            id: true,
            author: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
    });

    res.json(effect);
});

router.get("/effect/:id", withUser(), async (req, res, next) => {
    let id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).end();
    }

    let effect = await prisma.effect.findUnique({
        where: {
            id: id,
        },
        select: {
            code: true,
            name: true,
            id: true,
            author: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
    });

    if (!effect) {
        return res.status(404).end();
    }

    res.json(effect);
});

router.post("/leds", withUser(), async (req, res, next) => {
    let message = req.body;
    console.log(message);
    sendArduino(message);
});
export default router;

router.get("/users", async (req, res, next) => {
    let user = await prisma.user.findMany({});
    res.json({ status: "ok", user });
});
