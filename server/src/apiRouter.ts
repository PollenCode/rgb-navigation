import { Router } from "express";
import { createToken, createUserAccessToken, getOAuthUrl } from "./auth";
import { isDevelopment } from "./helpers";
import { withUser } from "./middleware";
import jsonwebtoken from "jsonwebtoken";
import { PrismaClient } from ".prisma/client";
import fetch from "node-fetch";
import { sendArduino, numberToLine } from "./socketServer";
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

router.get("/user", withUser(false, true), (req, res, next) => {
    res.json({
        name: req.user.name,
        identifier: req.user.identifier,
        id: req.user.id,
        email: req.user.email,
        admin: req.user.admin,
    });
});

router.post("/unbind", withUser(false, true), async (req, res, next) => {
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

router.post("/leds", withUser(true, false), async (req, res, next) => {
    let message = req.body;
    console.log(message);
    if (message.type == "roomEffect") {
        message = numberToLine(message.room);
    }
    console.log(message);
    sendArduino(message);
    res.end();
});

router.get("/users", withUser(true, false), async (req, res, next) => {
    let users = await prisma.user.findMany({});
    res.json({ status: "ok", users });
});

router.get("/createToken", withUser(true, false), async (req, res, next) => {
    let token = await prisma.token.create({ data: {} });
    let jwt = createToken(String(token.id));
    res.json({ status: "ok", jwt });
});

router.get("/getTokens", withUser(true, false), async (req, res, next) => {
    let tokens = await prisma.token.findMany({});
    res.json({ status: "ok", tokens });
});

router.delete("/deleteToken", withUser(true, false), async (req, res, next) => {
    let token = await prisma.token.delete({
        where: {
            id: req.body.id,
        },
    });
    res.json({ status: "ok", token });
});

router.put("/giveAdmin", withUser(true, false), async (req, res, next) => {
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

router.put("/takeAdmin", withUser(true, false), async (req, res, next) => {
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

// router.get("/lessenrooster", async (req, res, next) => {
//     let rnummer = "r0793503";
//     let link;
//     fetch("https://webwsp.aps.kuleuven.be/sap/opu/odata/sap/zc_ep_uurrooster_oauth_srv/users('" + rnummer + "')/classEvents?$format=json", {
//         headers: {
//             accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
//             "accept-language": "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7",
//             "cache-control": "max-age=0",
//             "sec-ch-ua": '" Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
//             "sec-ch-ua-mobile": "?0",
//             "sec-fetch-dest": "document",
//             "sec-fetch-mode": "navigate",
//             "sec-fetch-site": "none",
//             "sec-fetch-user": "?1",
//             "upgrade-insecure-requests": "1",
//             cookie: String(process.env.COOKIE),
//         },
//         body: undefined,
//         method: "GET",
//     }).then(async (e) => {
//         let data = await e.json();
//         link = data.d.results[0].locations.__deferred.uri;
//         fetch(link + "?$format=json", {
//             headers: {
//                 accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
//                 "accept-language": "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7",
//                 "cache-control": "max-age=0",
//                 "sec-ch-ua": '" Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
//                 "sec-ch-ua-mobile": "?0",
//                 "sec-fetch-dest": "document",
//                 "sec-fetch-mode": "navigate",
//                 "sec-fetch-site": "none",
//                 "sec-fetch-user": "?1",
//                 "upgrade-insecure-requests": "1",
//                 cookie: String(process.env.COOKIE),
//             },
//             body: undefined,
//             method: "GET",
//         }).then(async (e) => {
//             let data = await e.json();
//             let room = data.d.results[0].roomNumber;
//             console.log(room);
//             res.json({ status: "ok", room });
//         });
//     });
// });

export default router;
