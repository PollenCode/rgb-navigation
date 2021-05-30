import { Server } from "socket.io";
import http from "http";
import { validateDeviceAccessToken, validateUserAccessToken } from "./auth";
import { PrismaClient } from ".prisma/client";
import { LedControllerServerMessage } from "rgb-navigation-api";
import debug from "debug";

const logger = debug("rgb:socket");
const prisma = new PrismaClient();
let roomsCurrentlyBinding: {
    [roomId: string]: { socketId: string; userId: string };
} = {};
let socket: Server;

export function createSocketServer(server: http.Server) {
    socket = new Server(server, { cors: { origin: "*" } });

    socket.on("connection", (connection) => {
        // logger("new connection", connection.id);

        connection.on("nobind", ({ roomId }) => {
            if (roomsCurrentlyBinding[roomId] && connection.id === roomsCurrentlyBinding[roomId].socketId) {
                delete roomsCurrentlyBinding[roomId];
            }
        });

        connection.on("bind", ({ token, roomId }, callback) => {
            // Validate
            if (typeof token !== "string" || typeof roomId !== "string" || typeof callback !== "function") {
                return callback({ status: "error" });
            }

            // Check user credentials
            let tok = validateUserAccessToken(token);
            if (!tok || !("userId" in tok)) return callback({ status: "error" });

            // The system only supports one binding at a time
            if (roomsCurrentlyBinding[roomId]) {
                if (roomsCurrentlyBinding[roomId].socketId === connection.id) return callback({ status: "ok" });
                else return callback({ status: "busy" });
            }

            // The next nfcScan event will bind to this user
            roomsCurrentlyBinding[roomId] = { socketId: connection.id, userId: tok.userId };
            callback({ status: "ok" });
        });

        // This event is submitted by any device that wants to listen for events in a room.
        // When subscribed, you will listen to the following room events: nfcAlreadyBound, nfcUnknownScanned, userShouldFollow
        connection.on("subscribe", async ({ roomId }) => {
            if (typeof roomId !== "string") {
                return;
            }
            connection.join(roomId);
        });

        // This event is submitted by the nfc scanner, which scans a tag with unique id `uuid`.
        // Every nfc scanner is given a token to verify its identity.
        connection.on("nfcScan", async ({ token, uuid }) => {
            // Validate data
            if (typeof token !== "string" || typeof uuid !== "string") {
                logger("received invalid nfcScan data");
                return;
            }

            // The nfc scanner device token gets validated (to make sure this message comes from a verified nfc reader),
            // which also contains the room id it is located in.
            let deviceToken = validateDeviceAccessToken(token);
            if (!deviceToken) {
                logger("could not verify nfc scan");
                return;
            }
            let currentlyBinding = roomsCurrentlyBinding[deviceToken.roomId];

            // Get the user that is bound to the scanned uuid, will return null if there is no one bound yet.
            let boundUser = await prisma.user.findUnique({
                where: {
                    identifier: uuid,
                },
            });

            // Check if there is a binding action going on (someone is binding nfc to user account)
            if (currentlyBinding) {
                // Check if there is already someone bound to the nfc
                if (boundUser) {
                    logger("nfc already bound", uuid);
                    socket.in(deviceToken.roomId).emit("nfcAlreadyBound");
                    socket.in(currentlyBinding.socketId).emit("nfcAlreadyBound");
                    return;
                } else {
                    boundUser = await prisma.user.update({
                        where: {
                            id: currentlyBinding.userId,
                        },
                        data: {
                            identifier: uuid,
                        },
                    });
                    socket.in(currentlyBinding.socketId).emit("nfcBound", { identifier: uuid });
                }
            } else if (!boundUser) {
                logger("unknown nfc scanned", uuid);
                socket.in(deviceToken.roomId).emit("nfcUnknownScanned");
                return;
            }

            // TODO: enable leds for user
            let numb = Math.floor(Math.random() * 6);
            let ledMessage: LedControllerServerMessage = roomNumberToLine(numb);
            let color = "rgb(" + ledMessage.r + "," + ledMessage.b + "," + ledMessage.g + ")";
            let followData = { name: boundUser.name, color: color };
            logger("enable led for user", boundUser.id, boundUser.name);
            socket.in(deviceToken.roomId).emit("userShouldFollow", followData);
            socket.emit("ledController", ledMessage);
            if (currentlyBinding) {
                socket.in(currentlyBinding.socketId).emit("userShouldFollow", followData);
                delete roomsCurrentlyBinding[deviceToken.roomId];
            }
        });

        connection.on("disconnect", () => {
            for (let roomId in roomsCurrentlyBinding) {
                if (roomsCurrentlyBinding[roomId] && roomsCurrentlyBinding[roomId].socketId === connection.id) {
                    delete roomsCurrentlyBinding[roomId];
                }
            }
        });

        connection.on("arduinoSubscribe", (data) => {
            if (data) connection.join("arduino");
            else connection.leave("arduino");
        });

        connection.on("arduinoOutput", (data) => {
            socket.in("arduino").emit("arduinoOutput", data);
        });
    });

    return socket;
}

export function sendActiveEffect(activeEffectId: number, carrouselInterval: number) {
    socket.emit("activeEffect", { activeEffectId, carrouselInterval });
}

export function sendLedController(message: LedControllerServerMessage) {
    logger("sendArduino", message);
    socket.emit("ledController", message);
}

export function roomNumberToLine(roomNumber: number) {
    let room;
    let startLed = 0;
    let endLed = 0;
    let r = 0;
    let g = 0;
    let b = 0;
    switch (roomNumber) {
        case 0:
            room = "D027";
            startLed = 784;
            endLed = 723;
            r = 255;
            g = 0;
            b = 0;
            break;
        case 1:
            room = "D029";
            startLed = 784;
            endLed = 552;
            r = 0;
            g = 0;
            b = 255;
            break;
        case 2:
            room = "D030";
            startLed = 784;
            endLed = 517;
            r = 238;
            g = 130;
            b = 238;
            break;
        case 3:
            room = "D034a";
            startLed = 0;
            endLed = 308;
            r = 238;
            g = 130;
            b = 238;
            break;
        case 4:
            room = "D034b";
            startLed = 0;
            endLed = 206;
            r = 255;
            g = 165;
            b = 0;
            break;
        case 5:
            room = "D035";
            startLed = 0;
            endLed = 170;
            r = 58;
            g = 255;
            b = 255;
            break;
    }
    let ledMessage: LedControllerServerMessage = {
        type: "enableLine",
        startLed: startLed,
        endLed: endLed,
        duration: 30,
        r: r,
        b: b,
        g: g,
    };

    return ledMessage;
}
