require("dotenv").config();
import WebSocket from "ws";
import SerialPort from "serialport";

// Read from .env file
const { URL, SERIAL_PORT, BAUD_RATE } = process.env;
if (!URL || !SERIAL_PORT || !BAUD_RATE) {
    console.error("Please create an .env file and restart the server. (You should copy the .env.example file)");
    process.exit(-1);
}

console.log(`opening port ${SERIAL_PORT} with baud rate ${BAUD_RATE}`);

let port = new SerialPort(SERIAL_PORT, { baudRate: parseInt(BAUD_RATE) });
port.on("error", (error) => {
    console.error("could not open serial port:", error);
});
port.on("data", (data) => {
    console.log("incoming serial data", data);
});

let socket: WebSocket | null = null;

function processMessage(data: any) {
    console.log("incoming data", data);
}

function connect() {
    console.log("connecting...");
    socket = new WebSocket(URL!);
    socket.on("open", () => {
        console.log("connection established");
    });
    socket.on("message", processMessage);
    socket.on("close", () => {
        console.log("connection closed");
        // Try to reconnect...
        setTimeout(connect, 5000);
    });
}

connect();
