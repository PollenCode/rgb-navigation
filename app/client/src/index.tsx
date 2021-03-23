import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { App } from "./App";
import { SocketContext } from "./socketContext";
import { io } from "socket.io-client";
import { BrowserRouter as Router, Redirect, Route, Switch } from "react-router-dom";
import { Register } from "./Register";

let socket = io(process.env.NODE_ENV === "development" ? "http://localhost:3001/" : "/");

ReactDOM.render(
    <React.StrictMode>
        <SocketContext.Provider value={{ socket }}>
            <Router>
                <Switch>
                    <Route path="/" exact component={App} />
                    <Route path="/register" component={Register} />
                    <Redirect to="/" />
                </Switch>
            </Router>
        </SocketContext.Provider>
    </React.StrictMode>,
    document.getElementById("root")
);
