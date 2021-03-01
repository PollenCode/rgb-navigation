require("dotenv").config();
import WebSocket from "ws";
import { SerialLedController } from "./communicate";

// Read from .env file
const { URL, SERIAL_PORT, BAUD_RATE } = process.env;
if (!URL || !SERIAL_PORT || !BAUD_RATE) {
    console.error("Please create an .env file and restart the server. (You should copy the .env.example file)");
    process.exit(-1);
}

console.log(`opening port ${SERIAL_PORT} with baud rate ${BAUD_RATE}`);

let arduino = new SerialLedController(SERIAL_PORT, parseInt(BAUD_RATE));
setTimeout(() => arduino.sendEnableLine(0, 10, 0, 0, 0, 100), 5000);
setTimeout(() => arduino.sendEnableLine(0, 50, 0, 0, 0, 100), 8000);
setTimeout(() => arduino.sendEnableLine(0, 180, 0, 0, 0, 100), 10000);

let socket: WebSocket | null = null;

function processMessage(data: any) {
    console.log("incoming", data);
}

function connect() {
    socket = new WebSocket(URL!);
    socket.on("open", () => {
        console.log("connection established");
    });
    socket.on("message", (e) => {
        try {
            processMessage(JSON.stringify(e));
        } catch (ex) {
            console.error("could not process data", ex);
        }
    });
    socket.on("close", () => {
        console.log("connection closed");
        // Try to reconnect...
        setTimeout(connect, 5000);
    });
}

connect();
