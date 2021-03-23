require("dotenv").config(); // Load .env file
import express, { json } from "express";
import http from "http";
import https from "https";
import { LedControllerServerMessage } from "../../shared/Message";
import { Server } from "socket.io";
import querystring from "querystring";
import fetch from "node-fetch";
import jsonwebtoken from "jsonwebtoken";
import { PrismaClient, User } from "@prisma/client";
import { withUser } from "./middleware";
import { createDeviceAccessToken, createUserAccessToken, getOAuthUrl, validateDeviceAccessToken, validateUserAccessToken } from "./auth";
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

    let accessToken = createUserAccessToken(user.id);
    res.redirect((isDevelopment ? "http://localhost:3000/complete/" : "/complete/") + encodeURIComponent(accessToken));
});

app.post("/user", withUser(), (req, res, next) => {
    res.json({ status: "ok", user: req.user });
});

app.post("/unbind", withUser(), async (req, res, next) => {
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

app.post("/leds", (req, res, next) => {
    // Temp
    socket.in("leds").emit(req.body);
    res.json({
        status: "ok",
    });
});

if (isDevelopment) {
    app.get("/deviceToken/:roomId", (req, res, next) => {
        res.end(createDeviceAccessToken(req.params.roomId));
    });
}

let server = http.createServer(app);
let socket = new Server(server, { cors: { origin: "*" } });

let roomsCurrentlyBinding: {
    [roomId: string]: { socketId: string; userId: string };
} = {};

socket.on("connection", (connection) => {
    // console.log("new connection", connection.id);

    connection.on("bind", ({ token, roomId }, callback) => {
        // Validate
        if (typeof token !== "string" || typeof roomId !== "string") {
            return callback({ status: "error" });
        }

        // Check user credentials
        let tok = validateUserAccessToken(token);
        if (!tok) return callback({ status: "error" });

        // The system only supports one binding at a time
        if (roomsCurrentlyBinding[roomId]) {
            if (roomsCurrentlyBinding[roomId].socketId === connection.id) return callback({ status: "ok" });
            else return callback({ status: "busy" });
        }

        // The next nfcScan event will bind to this user
        roomsCurrentlyBinding[roomId] = { socketId: connection.id, userId: tok.userId };
        callback({ status: "ok" });
    });

    // This event is submitted by any device that wants to listen for events in a room.
    // When subscribed, you will listen to the following room events: nfcAlreadyBound, nfcUnknownScanned, userShouldFollow
    connection.on("subscribe", async ({ roomId }) => {
        if (typeof roomId !== "string") {
            return;
        }
        connection.join(roomId);
    });

    // This event is submitted by the nfc scanner, which scans a tag with unique id `uuid`.
    // Every nfc scanner is given a token to verify its identity.
    connection.on("nfcScan", async ({ token, uuid }) => {
        // Validate data
        if (typeof token !== "string" || typeof uuid !== "string") {
            console.warn("received invalid nfcScan data");
            return;
        }

        // The nfc scanner device token gets validated (to make sure this message comes from a verified nfc reader),
        // which also contains the room id it is located in.
        let deviceToken = validateDeviceAccessToken(token);
        if (!deviceToken) {
            console.warn("could not verify nfc scan");
            return;
        }
        let currentlyBinding = roomsCurrentlyBinding[deviceToken.roomId];

        // Get the user that is bound to the scanned uuid, will return null if there is no one bound yet.
        let boundUser = await prisma.user.findUnique({
            where: {
                identifier: uuid,
            },
        });

        // Check if there is a binding action going on (someone is binding nfc to user account)
        if (currentlyBinding) {
            // Check if there is already someone bound to the nfc
            if (boundUser) {
                console.warn("nfc already bound", uuid);
                socket.in(deviceToken.roomId).emit("nfcAlreadyBound");
                socket.in(currentlyBinding.socketId).emit("nfcAlreadyBound");
                return;
            } else {
                boundUser = await prisma.user.update({
                    where: {
                        id: currentlyBinding.userId,
                    },
                    data: {
                        identifier: uuid,
                    },
                });
                socket.in(currentlyBinding.socketId).emit("nfcBound", { identifier: uuid });
            }
        } else if (!boundUser) {
            console.warn("unknown nfc scanned", uuid);
            socket.in(deviceToken.roomId).emit("nfcUnknownScanned");
            return;
        }

        // TODO: enable leds for user
        let followData = {};
        console.warn("enable led for user", boundUser.id, boundUser.name);
        socket.in(deviceToken.roomId).emit("userShouldFollow", followData);
        if (currentlyBinding) {
            socket.in(currentlyBinding.socketId).emit("userShouldFollow", followData);
            delete roomsCurrentlyBinding[deviceToken.roomId];
        }
    });

    connection.on("disconnect", () => {
        for (let roomId in roomsCurrentlyBinding) {
            if (roomsCurrentlyBinding[roomId].socketId === connection.id) {
                delete roomsCurrentlyBinding[roomId];
            }
        }
    });
});

const port = parseInt(process.env.PORT);
server.listen(port);
console.log(`Server started on port ${port}`);
