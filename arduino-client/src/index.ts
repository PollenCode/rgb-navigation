require("dotenv").config();
import { io } from "socket.io-client";
import { SerialLedController } from "./communicate";
import fetch from "node-fetch";
global.fetch = fetch as any;
import { LedControllerServerMessage, RGBClient } from "rgb-navigation-api";
import { createProject } from "./build";
import { spawn } from "child_process";

// Read from .env file
const { SERIAL_PORT, BAUD_RATE } = process.env;
if (!SERIAL_PORT || !BAUD_RATE) {
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

const BOARD_TYPE = "arduino:avr:uno";

export function buildProject(destination: string, upload = false): Promise<boolean> {
    return new Promise((resolve, reject) => {
        let args = ["compile"];
        if (upload) args.push("--upload");
        args.push("-b", BOARD_TYPE, "-p", process.env.SERIAL_PORT!, destination);

        let c = spawn(`/usr/local/bin/arduino-cli`, args);

        c.stdout.on("data", (data) => {
            client.emitArduinoBuild({ type: "stdout", data: data.toString() });
            console.log("| " + data);
        });

        c.stderr.on("data", (data) => {
            client.emitArduinoBuild({ type: "stderr", data: data.toString() });
            console.log("! " + data);
        });

        c.on("exit", (code) => {
            resolve(code === 0);
        });
    });
}

async function rebuild(defaultEffectId: number) {
    client.emitArduinoBuild({ type: "status", percent: 0, status: "Starten" });

    await arduino.pause();
    let effects = await client.getEffects(true);

    client.emitArduinoBuild({ type: "status", percent: 0.15, status: "Project aanmaken" });

    let dest = "output/arduino" + new Date().getTime();
    await createProject(dest, effects, defaultEffectId);

    client.emitArduinoBuild({ type: "status", percent: 0.3, status: "Compileren" });

    await buildProject(dest, true);

    await arduino.resume();

    client.emitArduinoBuild({ type: "status", percent: 1, status: "Klaar" });
}

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
            await rebuild(data.id);
            break;
        default:
            console.warn(`received unknown message ${JSON.stringify(data)}`);
            break;
    }
}

client.socket.emit("subscribe", { roomId: "dgang" });

client.socket.on("ledController", (obj: any) => {
    processMessage(obj);
});
