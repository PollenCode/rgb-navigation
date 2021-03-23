import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { SocketContext } from "./socketContext";
import { io } from "socket.io-client";
import { isDevelopment } from "./helpers";
import { Routes } from "./routes";

let socket = io(isDevelopment ? "http://localhost:3001/" : "/");

ReactDOM.render(
    <React.StrictMode>
        <SocketContext.Provider value={{ socket }}>
            <Routes />
        </SocketContext.Provider>
    </React.StrictMode>,
    document.getElementById("root")
);
