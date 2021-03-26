require("dotenv").config();
import { io } from "socket.io-client";

if (!process.env.URL || !process.env.TOKEN) {
    console.error("Please create an .env file and restart the server. (You should copy the .env.example file)");
    process.exit(-1);
}

let socket = io(process.env.URL);
let uuid = "asdfjklasdf";

setTimeout(() => {
    socket.emit("nfcScan", { uuid: uuid, token: process.env.TOKEN! });
}, 2000);
