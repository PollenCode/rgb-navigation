require("dotenv").config(); // Load .env file
import express, { json } from "express";
import http from "http";
import https from "https";
import { createDeviceAccessToken, getOAuthUrl } from "./auth";
import { isDevelopment } from "./helpers";
import { createSocketServer } from "./socketServer";
import apiRouter from "./apiRouter";
import path from "path";

if (!process.env.NODE_ENV || !process.env.PORT || !process.env.JWT_SECRET) {
    console.error("Please create an .env file and restart the server. (You should copy the .env.example file)");
    process.exit(1);
}

let app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
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
app.get("/", async (req, res, next) => {
    res.redirect(getOAuthUrl());
});
app.use(express.static("public"));
app.use("/api", apiRouter);

if (isDevelopment) {
    app.get("/deviceToken/:roomId", (req, res, next) => {
        res.end(createDeviceAccessToken(req.params.roomId));
    });
}

app.use((req, res, next) => {
    res.sendFile("index.html", { root: "public" });
});

let server = http.createServer(app);
createSocketServer(server);

let port = parseInt(process.env.PORT);
server.listen(port);
console.log(`Server started on port ${port}`);
