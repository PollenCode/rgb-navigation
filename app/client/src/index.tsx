import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { App } from "./App";
import { SocketContext } from "./socketContext";
import { io } from "socket.io-client";

let socket = io(process.env.NODE_ENV === "development" ? "http://localhost:3001/" : "/");

ReactDOM.render(
    <React.StrictMode>
        <SocketContext.Provider value={{ socket }}>
            <App />
        </SocketContext.Provider>
    </React.StrictMode>,
    document.getElementById("root")
);
