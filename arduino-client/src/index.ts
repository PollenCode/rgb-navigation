require("dotenv").config();
import { io } from "socket.io-client";
import { SerialLedController } from "./communicate";
import fetch from "node-fetch";
global.fetch = fetch as any;
import { LedControllerServerMessage, RGBClient } from "rgb-navigation-api";

// Read from .env file
const { SERIAL_PORT, BAUD_RATE } = process.env;
if (!SERIAL_PORT || !BAUD_RATE) {
    console.error("Please create an .env file and restart the server. (You should copy the .env.example file)");
    process.exit(-1);
}

console.log(`opening serial port ${SERIAL_PORT} with baud rate ${BAUD_RATE}`);

let client = new RGBClient();
let arduino = new SerialLedController(SERIAL_PORT, parseInt(BAUD_RATE));
// setTimeout(() => arduino.sendEffect(1), 1000);
// setTimeout(() => arduino.sendRoom(1, 1), 4000);
// setTimeout(() => arduino.sendEnableLine(0, 0, 0, 255, 0, 50, 60), 2000);
// setTimeout(() => arduino.sendEnableLine(0, 0, 255, 0, 0, 31, 8), 5000);
// setTimeout(() => arduino.sendDisableLine(0), 15000);
// setTimeout(() => arduino.sendEnableLine(1, 0, 255, 0, 0, 15, 5), 17000);
// setTimeout(() => arduino.sendDisableLine(1), 5000);
// setTimeout(
//     () =>
//         arduino.uploadProgram(
//             Buffer.from(
//                 "000000000000000000000000000000000108000104001004000214020c00010c00040001322105010c00220704ff01010c0011080000030008010003000802000f",
//                 "hex"
//             ),
//             16
//         ),
//     1000
// );
// setTimeout(() => arduino.sendEffect(1), 1000);

async function processMessage(data: LedControllerServerMessage) {
    console.log("receive", data);
    switch (data.type) {
        case "enableLine":
            arduino.sendEnableLine(data.r, data.g, data.b, data.startLed, data.endLed, data.duration);
            break;
        case "uploadProgram":
            arduino.uploadProgram(Buffer.from(data.byteCode, "hex"), data.entryPoint);
            break;
        default:
            console.warn(`received unknown message ${JSON.stringify(data)}`);
            break;
    }
}

arduino.port.on("data", (data) => {
    client.socket.emit("arduinoOutput", { type: "data", data: data.toString("utf-8") });
});

arduino.port.on("error", (data) => {
    client.socket.emit("arduinoOutput", { type: "error", data: String(data) });
});

client.socket.on("connect", () => {
    console.log("connected");
});

client.socket.emit("subscribe", { roomId: "dgang" });

client.socket.on("ledController", (obj: any) => {
    processMessage(obj);
});
