require("dotenv").config(); // Load .env file
import express from "express";
import http from "http";
import WebSocket from "ws";

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

// Example request with slowdown to show how react works
app.post("/message", (req, res, next) => {
    setTimeout(() => {
        res.json({
            message: "This is a message from the server",
        });
    }, 500);
});

let server = http.createServer(app);
let socket = new WebSocket.Server({ server, path: "/ws" });

let connections: WebSocket[] = [];

socket.on("connection", (connection) => {
    console.log("new connection");
    connections.push(connection);

    connection.on("message", (data) => {
        console.log("incoming data", data);
        for (let i = 0; i < connections.length; i++) {
            let c = connections[i];
            if (c !== connection) c.send(data);
        }
    });

    connection.on("close", () => {
        console.log("connection closed");
        connections.splice(connections.indexOf(connection), 1);
    });
});

const port = parseInt(process.env.PORT);
server.listen(port);
console.log(`Server started on port ${port}`);
