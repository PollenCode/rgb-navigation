require("dotenv").config();
import { io } from "socket.io-client";
import { SerialLedController } from "./communicate";
import { LedControllerServerMessage, RGBClient } from "rgb-navigation-api";
import { createProject } from "./build";

// Read from .env file
const { URL, SERIAL_PORT, BAUD_RATE } = process.env;
if (!URL || !SERIAL_PORT || !BAUD_RATE) {
    console.error("Please create an .env file and restart the server. (You should copy the .env.example file)");
    process.exit(-1);
}

console.log(`opening serial port ${SERIAL_PORT} with baud rate ${BAUD_RATE}`);

let client = new RGBClient();
let arduino = new SerialLedController(SERIAL_PORT, parseInt(BAUD_RATE));
//setTimeout(() => arduino.sendEffect(1), 2000);
//setTimeout(() => arduino.sendRoom(1, 1), 4000);
//setTimeout(() => arduino.sendEnableLine(0, 0, 0, 255, 0, 50, 60), 2000);
//setTimeout(() => arduino.sendEnableLine(0, 0, 255, 0, 0, 31, 8), 5000);
// setTimeout(() => arduino.sendDisableLine(0), 15000);
// setTimeout(() => arduino.sendEnableLine(1, 0, 255, 0, 0, 15, 5), 17000);
// setTimeout(() => arduino.sendDisableLine(1), 25000);

async function processMessage(data: LedControllerServerMessage) {
    console.log("receive", data);
    switch (data.type) {
        case "setIdleEffect":
            arduino.sendEffect(data.effect);
            break;
        case "enableLine":
            arduino.sendEnableLine(0, data.r, data.g, data.b, data.startLed, data.endLed, data.duration);
            break;
        case "roomEffect":
            arduino.sendRoom(1, data.room);
            break;
        case "customEffect":
            let effects = await client.getEffects();
            createProject("arduino" + new Date().getTime(), effects);

            console.log("build", data.id);
            break;
        default:
            console.warn(`received unknown message ${JSON.stringify(data)}`);
            break;
    }
}

let socket = io(URL!);

socket.emit("subscribe", { roomId: "dgang" });

socket.on("usersShouldFollow", (obj) => {
    processMessage(obj);
});
