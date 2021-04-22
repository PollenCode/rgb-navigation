import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Switch, Route, Redirect, useHistory } from "react-router-dom";
import { Admin } from "./Admin";
import { Complete } from "./Complete";
import { isDevelopment, serverPath } from "./helpers";
import { Overview } from "./Overview";
import { LedController } from "./LedController";
import { UsersList } from "./Users";
import { AuthContext } from "./AuthContext";
import { PageWrapper } from "./components/PageWrapper";

export function Routes() {
    const [auth, setAuth] = useState<string | null>(null);
    const history = useHistory();

    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        let token = query.get("s") || localStorage.getItem("s");
        if (!token) {
            // Redirect to auth
            window.location.href = serverPath;
        } else {
            setAuth(token);
            localStorage.setItem("s", token);
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
                <Route path="/admin" component={AdminRouter} />
                <Redirect to="/" />
            </Switch>
        </AuthContext.Provider>
    );
}

function AdminRouter() {
    return (
        <PageWrapper>
            <Route path="/admin" exact component={Admin} />
            <Route path="/admin/overview/:roomId" exact component={Overview} />
            <Route path="/admin/ledcontrol" exact component={LedController} />
            <Route path="/admin/users" exact component={UsersList} />
            <Redirect to="/admin" />
        </PageWrapper>
    );
}
