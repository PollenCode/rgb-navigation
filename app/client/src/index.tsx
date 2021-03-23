import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { App } from "./App";
import { SocketContext } from "./socketContext";
import { io } from "socket.io-client";
import { BrowserRouter as Router, Redirect, Route, Switch } from "react-router-dom";
import { isDevelopment } from "./helpers";
import { Complete } from "./Complete";
import { Overview } from "./Overview";

let socket = io(isDevelopment ? "http://localhost:3001/" : "/");

ReactDOM.render(
    <React.StrictMode>
        <SocketContext.Provider value={{ socket }}>
            <Router>
                <Switch>
                    <Route path="/" exact component={App} />
                    <Route path="/complete/:id" exact component={Complete} />
                    <Route path="/overview/:roomId" exact component={Overview} />
                    <Redirect to="/" />
                </Switch>
            </Router>
        </SocketContext.Provider>
    </React.StrictMode>,
    document.getElementById("root")
);
