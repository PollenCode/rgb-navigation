require("dotenv").config(); // Load .env file
import express, { json } from "express";
import http from "http";
import https from "https";
import { createDeviceAccessToken, getGoogleOAuthUrl } from "./auth";
import { isDevelopment } from "./helpers";
import { createSocketServer } from "./socketServer";
import apiRouter from "./apiRouter";
import path from "path";
import fs from "fs";
import debug from "debug";
import helmet from "helmet";

const logger = debug("rgb:server");

if (!process.env.NODE_ENV || !process.env.PORT || !process.env.JWT_SECRET) {
    console.error("Please create an .env file and restart the server. (You should copy the .env.example file)");
    process.exit(1);
}

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

if (isDevelopment) {
    // Bypass cors during development
    app.use((req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Methods", "*");
        next();
    });
}

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                "default-src": ["'self'"],
                "base-uri": ["'self'"],
                "block-all-mixed-content": [],
                "font-src": ["'self'", "https:", "data:"],
                "frame-ancestors": ["'self'"],
                "img-src": ["'self'", "data:", "https://www.google-analytics.com"],
                "object-src": ["'none'"],
                "script-src": [
                    "'self'",
                    "https://www.google-analytics.com",
                    "https://ssl.google-analytics.com",
                    "https://cdn.jsdelivr.net",
                    "'unsafe-eval'",
                ],
                "worker-src": ["'self'", "blob:"],
                "script-src-attr": ["'none'"],
                "style-src": ["'self'", "https:", "'unsafe-inline'"],
                "upgrade-insecure-requests": [],
                "connect-src": ["'self'", "https://maps.googleapis.com", "https://www.google-analytics.com"],
            },
        },
    })
);

app.use(express.static("public"));
app.use("/api", apiRouter);

app.use((req, res, next) => {
    res.sendFile("index.html", { root: "public" });
});

if (process.env.SSL_KEY_FILE && process.env.SSL_CERT_FILE && process.env.SSL_CA_FILE) {
    let httpsServer = https.createServer(
        {
            key: fs.readFileSync(process.env.SSL_KEY_FILE),
            cert: fs.readFileSync(process.env.SSL_CERT_FILE),
            ca: fs.readFileSync(process.env.SSL_CA_FILE),
        },
        app
    );
    httpsServer.listen(443);
    createSocketServer(httpsServer);
    logger("listening for https on port 443");

    let httpServer = express();
    httpServer.use((req, res) => {
        res.redirect("https://" + req.headers.host + req.url);
    });
    httpServer.listen(80);
    logger("listening for http on port 80");
} else {
    if (!process.env.PORT) {
        logger("missing PORT environment variable");
        process.exit(-1);
    }

    let port = parseInt(process.env.PORT);
    let httpServer = http.createServer(app);
    httpServer.listen(port);
    createSocketServer(httpServer);
    logger("development port open at %d", port);
}
