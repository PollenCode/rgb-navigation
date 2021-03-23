import React from "react";
import { BrowserRouter as Router, Switch, Route, Redirect } from "react-router-dom";
import { Admin } from "./Admin";
import { Complete } from "./Complete";
import { isDevelopment } from "./helpers";
import { Overview } from "./Overview";

export function Routes() {
    return (
        <Router>
            <Switch>
                <Route
                    path="/"
                    exact
                    render={() => {
                        window.location.href = isDevelopment ? "http://localhost:3001/" : "/";
                        return null;
                    }}
                />
                <Route path="/admin" exact component={Admin} />
                <Route path="/complete/:token" exact component={Complete} />
                <Route path="/overview/:roomId" exact component={Overview} />
                <Redirect to="/" />
            </Switch>
        </Router>
    );
}