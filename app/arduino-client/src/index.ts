require("dotenv").config();
import WebSocket from "ws";

if (!process.env.URL) {
    console.error("Please create an .env file and restart the server. (You should copy the .env.example file)");
    process.exit(-1);
}

let socket: WebSocket | null = null;

function connect() {
    console.log("connecting...");
    socket = new WebSocket(process.env.URL!);
    socket.on("open", () => {
        console.log("connection established");
    });
    socket.on("close", () => {
        console.log("connection closed");
        // Try to reconnect...
        setTimeout(connect, 5000);
    });
}

connect();
