require("dotenv").config();
import WebSocket from "ws";
import { SerialLedController } from "./communicate";
import { LedControllerServerMessage } from "../../shared/Message";

// Read from .env file
const { URL, SERIAL_PORT, BAUD_RATE } = process.env;
if (!URL || !SERIAL_PORT || !BAUD_RATE) {
    console.error("Please create an .env file and restart the server. (You should copy the .env.example file)");
    process.exit(-1);
}

console.log(`opening port ${SERIAL_PORT} with baud rate ${BAUD_RATE}`);

let arduino = new SerialLedController(SERIAL_PORT, parseInt(BAUD_RATE));
// setTimeout(() => arduino.sendEnableLine(0, 255, 0, 0, 30, 0, 10), 5000);
// setTimeout(() => arduino.sendDisableLine(0), 15000);
// setTimeout(() => arduino.sendEnableLine(1, 0, 255, 0, 0, 15, 5), 17000);
// setTimeout(() => arduino.sendDisableLine(1), 25000);

let socket: WebSocket | null = null;

function processMessage(data: LedControllerServerMessage) {
    console.log("receive", data);
    switch (data.type) {
        case "setIdleEffect":
            arduino.sendEffect(data.effect);
            break;
        case "enableLine":
            arduino.sendEnableLine(0, data.r, data.g, data.b, data.startLed, data.endLed, data.duration);
            break;
        default:
            console.warn(`received unknown message ${JSON.stringify(data)}`);
            break;
    }
}

function connect() {
    socket = new WebSocket(URL!);
    socket.on("open", () => {
        console.log("connection established");
    });
    socket.on("message", (e) => {
        try {
            processMessage(JSON.parse(e as string));
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
