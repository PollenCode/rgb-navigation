import React from "react";
import { BrowserRouter as Router, Switch, Route, Redirect } from "react-router-dom";
import { App } from "./App";
import { Complete } from "./Complete";
import { Overview } from "./Overview";

export function Routes() {
    return (
        <Router>
            <Switch>
                <Route path="/" exact component={App} />
                <Route path="/complete/:token" exact component={Complete} />
                <Route path="/overview/:roomId" exact component={Overview} />
                <Redirect to="/" />
            </Switch>
        </Router>
    );
}
