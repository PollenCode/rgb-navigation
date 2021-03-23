import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { App } from "./App";
import { SocketContext } from "./socketContext";
import { io } from "socket.io-client";
import { BrowserRouter as Router, Redirect, Route, Switch } from "react-router-dom";
import { isDevelopment } from "./helpers";
import { Complete } from "./Complete";

let socket = io(isDevelopment ? "http://localhost:3001/" : "/");

ReactDOM.render(
    <React.StrictMode>
        <SocketContext.Provider value={{ socket }}>
            <Router>
                <Switch>
                    <Route path="/" exact component={App} />
                    <Route path="/complete/:id" exact component={Complete} />
                    <Redirect to="/" />
                </Switch>
            </Router>
        </SocketContext.Provider>
    </React.StrictMode>,
    document.getElementById("root")
);
