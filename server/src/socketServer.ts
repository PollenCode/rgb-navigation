import { Server } from "socket.io";
import http from "http";
import { validateDeviceAccessToken, validateUserAccessToken } from "./auth";
import { PrismaClient } from ".prisma/client";
import { LedControllerServerMessage } from "rgb-navigation-api";
import debug from "debug";
import tv, { Schema } from "typed-object-validator";
import { KUCourse, kulGetSchedule, kulRefreshToken, parseKulCourseDate, parseKulCourseTime } from "./kul";

const logger = debug("rgb:socket");
const prisma = new PrismaClient();

// The system will still detect if the user is too early
const TIME_SHIFT_BACKWARDS_MILLISECONDS = 1000 * 60 * 30;
const LED_PER_ROOM_NUMBER: {
    [roomNumber: string]: {
        startLed: number;
        endLed: number;
    };
} = {
    D027: {
        startLed: 784,
        endLed: 723,
    },
    D029: {
        startLed: 784,
        endLed: 552,
    },
    D030: {
        startLed: 784,
        endLed: 517,
    },
    D034a: {
        startLed: 0,
        endLed: 308,
    },
    D034b: {
        startLed: 0,
        endLed: 206,
    },
    D035: {
        startLed: 0,
        endLed: 170,
    },
};

let roomsCurrentlyBinding: {
    [roomId: string]: { socketId: string; userId: string };
} = {};
let socket: Server;

function validateMessage<T>(schema: Schema<T>, handler: (val: T, callback: (...params: any) => void) => void) {
    return (data: any, callback: any) => {
        let err = schema.validate(data, { abortEarly: true });
        if (err) {
            logger("could not validate", data, err);
            return;
        }
        handler(schema.transform(data), callback);
    };
}

export function createSocketServer(server: http.Server) {
    socket = new Server(server, { cors: { origin: "*" } });

    socket.on("connection", (connection) => {
        connection.on(
            "nobind",
            validateMessage(
                tv.object({
                    roomId: tv.string(),
                }),
                ({ roomId }) => {
                    if (roomsCurrentlyBinding[roomId] && connection.id === roomsCurrentlyBinding[roomId].socketId) {
                        delete roomsCurrentlyBinding[roomId];
                    }
                }
            )
        );

        connection.on(
            "bind",
            validateMessage(
                tv.object({
                    token: tv.string(),
                    roomId: tv.string(),
                }),
                ({ token, roomId }, callback) => {
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
                }
            )
        );

        // This event is submitted by any device that wants to listen for events in a room.
        // When subscribed, you will listen to the following room events: nfcAlreadyBound, nfcUnknownScanned, userShouldFollow
        connection.on("subscribe", async () => {
            connection.join("dgang");
        });

        // This event is submitted by the nfc scanner, which scans a tag with unique id `uuid`.
        // Every nfc scanner is given a token to verify its identity.
        connection.on(
            "nfcScan",
            validateMessage(
                tv.object({
                    token: tv.string(),
                    uuid: tv.string(),
                }),
                async ({ token, uuid }) => {
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

                    logger("enable led for user", boundUser.id);

                    if (boundUser.refreshToken) {
                        let kuToken = await kulRefreshToken(boundUser.refreshToken);
                        if (!kuToken) {
                            console.error("could not refresh token for user after nfc scan");
                            socket.in(deviceToken.roomId).emit("nfcGetScheduleError");
                            return;
                        }

                        let now = new Date();
                        let schedule = await kulGetSchedule(boundUser.id, kuToken!.access_token, now);
                        if (!schedule) {
                            console.error("could not get schedule for user after nfc scan");
                            socket.in(deviceToken.roomId).emit("nfcGetScheduleError");
                            return;
                        }

                        let currentCourse: KUCourse | null = null;
                        for (let i = 0; i < schedule.d.results.length; i++) {
                            let course = schedule.d.results[i];
                            let date = parseKulCourseDate(course.date);
                            let startTime = parseKulCourseTime(course.startTime);
                            let endTime = parseKulCourseTime(course.endTime);
                            if (!date || !startTime || !endTime) {
                                console.warn("invalid date/time for course", course);
                                continue;
                            }

                            let startDate = new Date(date);
                            startDate.setHours(startTime.hour);
                            startDate.setMinutes(startTime.minute);
                            startDate.setSeconds(startTime.seconds);

                            let endDate = new Date(date);
                            endDate.setHours(endTime.hour);
                            endDate.setMinutes(endTime.minute);
                            endDate.setSeconds(endTime.seconds);

                            if (
                                now.getTime() >= startDate.getTime() - TIME_SHIFT_BACKWARDS_MILLISECONDS &&
                                now.getTime() < endDate.getTime() - TIME_SHIFT_BACKWARDS_MILLISECONDS
                            ) {
                                currentCourse = course;
                                break;
                            }
                        }

                        if (!currentCourse) {
                            console.log("user scanned but no course available");
                            socket.in(deviceToken.roomId).emit("nfcNoSchedule");
                            return;
                        }

                        if (
                            !currentCourse.locations ||
                            !Array.isArray(currentCourse.locations.results) ||
                            currentCourse.locations.results.length <= 0
                        ) {
                            console.error("no location specified for course", currentCourse);
                            socket.in(deviceToken.roomId).emit("nfcNoSchedule");
                            return;
                        }

                        let location = currentCourse.locations.results[0];

                        if (!(location.roomNumber in LED_PER_ROOM_NUMBER)) {
                            console.error("no location specified for course", currentCourse);
                            socket.in(deviceToken.roomId).emit("nfcOtherLocation", { roomName: location.roomName });
                            return;
                        }

                        let led = LED_PER_ROOM_NUMBER[location.roomNumber];
                    }

                    let roomNumber = Math.floor(Math.random() * 6);
                    let ledMessage: LedControllerServerMessage = roomNumberToLine(roomNumber);
                    let color = "rgb(" + ledMessage.r + "," + ledMessage.g + "," + ledMessage.b + ")";
                    let followData = { name: boundUser.name, color: color };

                    socket.in(deviceToken.roomId).emit("userShouldFollow", followData);
                    socket.emit("ledController", ledMessage);
                    if (currentlyBinding) {
                        socket.in(currentlyBinding.socketId).emit("userShouldFollow", followData);
                        delete roomsCurrentlyBinding[deviceToken.roomId];
                    }
                }
            )
        );

        connection.on(
            "arduinoOutput",
            validateMessage(
                tv.object({
                    token: tv.string(),
                    type: tv.string(),
                    data: tv.string().doTrim(false),
                }),
                ({ token, data, type }) => {
                    let deviceToken = validateDeviceAccessToken(token);
                    if (!deviceToken) {
                        logger("could not verify arduino output");
                        return;
                    }
                    socket.in("arduino").emit("arduinoOutput", { type, data });
                }
            )
        );

        connection.on("arduinoSubscribe", (data) => {
            if (data) connection.join("arduino");
            else connection.leave("arduino");
        });

        connection.on("disconnect", () => {
            for (let roomId in roomsCurrentlyBinding) {
                if (roomsCurrentlyBinding[roomId] && roomsCurrentlyBinding[roomId].socketId === connection.id) {
                    delete roomsCurrentlyBinding[roomId];
                }
            }
        });
    });

    return socket;
}

export function notifyActiveEffect(activeEffectId: number, carrouselInterval: number) {
    socket.emit("activeEffect", { activeEffectId, carrouselInterval });
}

export function notifyLedController(message: LedControllerServerMessage) {
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
            r = 245;
            g = 238;
            b = 60;
            break;
        case 1:
            room = "D029";
            startLed = 784;
            endLed = 552;
            r = 243;
            g = 77;
            b = 36;
            break;
        case 2:
            room = "D030";
            startLed = 784;
            endLed = 517;
            r = 9;
            g = 142;
            b = 201;
            break;
        case 3:
            room = "D034a";
            startLed = 0;
            endLed = 308;
            r = 102;
            g = 171;
            b = 40;
            break;
        case 4:
            room = "D034b";
            startLed = 0;
            endLed = 206;
            r = 104;
            g = 64;
            b = 184;
            break;
        case 5:
            room = "D035";
            startLed = 0;
            endLed = 170;
            r = 75;
            g = 199;
            b = 197;
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
