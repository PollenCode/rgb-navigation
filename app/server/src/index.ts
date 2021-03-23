require("dotenv").config(); // Load .env file
import express from "express";
import http from "http";
import https from "https";
import { LedControllerServerMessage } from "../../shared/Message";
import { Server } from "socket.io";

let app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

if (!process.env.NODE_ENV || !process.env.PORT) {
    console.error("Please create an .env file and restart the server. (You should copy the .env.example file)");
    process.exit(1);
}

if (process.env.NODE_ENV === "development") {
    // Otherwise browsers block requests
    console.log("In development mode");
    app.use((req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        next();
    });
}

app.get("/", (req, res, next) => {
    res.end("this is the server");
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
