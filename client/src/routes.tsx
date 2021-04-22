import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Switch, Route, Redirect, useHistory } from "react-router-dom";
import { Admin } from "./Admin";
import { Complete } from "./Complete";
import { isDevelopment, serverPath } from "./helpers";
import { Overview } from "./Overview";
import { LedController } from "./LedController";
import { UsersList } from "./Users";
import { AuthContext } from "./AuthContext";

export function Routes() {
    const [auth, setAuth] = useState<string | null>(null);
    const history = useHistory();

    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        console.log("window.location.search = ", window.location.search);
        if (!query.has("s")) {
            // Redirect to auth
            window.location.href = serverPath;
        } else {
            setAuth(query.get("s"));
            // Remove query string
            history.push(history.location.pathname);
        }
    }, []);

    if (!auth) {
        return null;
    }

    return (
        <AuthContext.Provider value={auth}>
            <Switch>
                <Route path="/" exact component={Complete} />
                <Route path="/admin" exact component={Admin} />
                <Route path="/overview/:roomId" exact component={Overview} />
                <Route path="/ledcontrol" exact component={LedController} />
                <Route path="/users" exact component={UsersList} />
                <Redirect to="/" />
            </Switch>
        </AuthContext.Provider>
    );
}
