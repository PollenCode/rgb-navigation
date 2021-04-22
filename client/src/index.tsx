import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { SocketContext } from "./SocketContext";
import { io } from "socket.io-client";
import { serverPath } from "./helpers";
import { Routes } from "./routes";
import { BrowserRouter } from "react-router-dom";

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
