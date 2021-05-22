import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { SocketContext } from "./SocketContext";
import { io } from "socket.io-client";
import { serverPath } from "rgb-navigation-api";
import { Routes } from "./routes";
import { BrowserRouter } from "react-router-dom";
import { beginRenderLeds } from "./simulate";

let socket = io(serverPath);

ReactDOM.render(
    <React.StrictMode>
        <BrowserRouter>
            <SocketContext.Provider value={{ socket }}>
                <Routes />
            </SocketContext.Provider>
        </BrowserRouter>
    </React.StrictMode>,
    document.getElementById("root")
);

window.addEventListener("load", () => {
    console.log("loaded");
    let canvas = document.getElementById("leds-canvas") as HTMLCanvasElement;
    beginRenderLeds(canvas);
});
