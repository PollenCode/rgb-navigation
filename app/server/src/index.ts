require("dotenv").config(); // Load .env file
import express from "express";
import http from "http";
import https from "https";
import { LedControllerServerMessage } from "../../shared/Message";
import { Server } from "socket.io";
import querystring from "querystring";
import fetch from "node-fetch";
import jsonwebtoken from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { withUser } from "./middleware";
import { createUserAccessToken, getOAuthUrl } from "./auth";
import { isDevelopment } from "./helpers";

if (!process.env.NODE_ENV || !process.env.PORT || !process.env.JWT_SECRET) {
    console.error("Please create an .env file and restart the server. (You should copy the .env.example file)");
    process.exit(1);
}

let prisma = new PrismaClient();

let app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
if (isDevelopment) {
    // Otherwise browsers block requests
    console.log("In development mode");
    app.use((req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        next();
    });
}

// https://developers.google.com/identity/protocols/oauth2/web-server
// https://developers.google.com/identity/protocols/oauth2/openid-connect

app.get("/", async (req, res, next) => {
    res.redirect(getOAuthUrl());
});

app.get("/oauth/complete", async (req, res, next) => {
    let code = req.query.code;
    if (!code || typeof code !== "string") {
        return res.status(400).json({ status: "error", error: "invalid code" });
    }

    console.log("complete", req.query.code, req.query.state);

    let googleResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            code,
            client_id: process.env.OAUTH_CLIENT_ID,
            client_secret: process.env.OAUTH_CLIENT_SECRET,
            redirect_uri: "http://localhost:3001/oauth/complete",
            grant_type: "authorization_code",
        }),
    });

    if (!googleResponse.ok) {
        console.error("google returned token error", await googleResponse.text());
        return res.status(400).json({ status: "error", error: "could not exchange tokens with google" });
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
    console.log("user", user);

    let data = {
        ...user,
        picture: googleTokenData.picture,
        accessToken: createUserAccessToken(user.id),
    };
    let encodedData = encodeURIComponent(Buffer.from(JSON.stringify(data)).toString("base64"));
    res.redirect((isDevelopment ? "http://localhost:3000/complete/" : "/complete/") + encodedData);
});

app.post("/user", withUser(), (req, res, next) => {
    res.json({ user: req.user });
});

app.post("/leds", (req, res, next) => {
    // Temp
    socket.in("leds").emit(req.body);
    res.json({
        status: "ok",
    });
});

let server = http.createServer(app);
let socket = new Server(server, { cors: { origin: "*" } });

socket.on("connection", (connection) => {
    console.log("new connection", connection.id);

    connection.on("subscribe", ({ to }) => {
        if (["nfcScan"].includes(to)) connection.join(to);
        else console.warn("received unknown subscription");
    });

    connection.on("nfcScan", ({ token, uuid }) => {
        connection.in("nfcScan").emit("nfcScan", { uuid });
    });
});

const port = parseInt(process.env.PORT);
server.listen(port);
console.log(`Server started on port ${port}`);
