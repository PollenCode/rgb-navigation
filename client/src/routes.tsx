import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter as Router, Switch, Route, Redirect, useHistory } from "react-router-dom";
import { Admin } from "./pages/Admin";
import { Complete } from "./pages/Complete";
import { Auth, RGBClient, serverPath } from "rgb-navigation-api";
import { Overview } from "./pages/Overview";
import { IdleEffects } from "./pages/IdleEffects";
import { UsersList } from "./Users";
import { AuthContext } from "./AuthContext";
import { PageWrapper } from "./components/PageWrapper";
import { DGang } from "./pages/DGang";

const client = new RGBClient();

export function Routes() {
    const query = new URLSearchParams(window.location.search);
    const [auth, setAuth] = useState<Auth | undefined>(undefined);
    const history = useHistory();

    useEffect(() => {
        client.on("auth", setAuth);

        if (query.has("s")) {
            client.setAuth(JSON.parse(atob(query.get("s")!)));
        } else if (localStorage.getItem("s")) {
            client.setAuth(JSON.parse(localStorage.getItem("s")!));
        } else {
            // Redirect to oauth
            window.location.href = serverPath;
        }

        return () => {
            client.off("auth", setAuth);
        };
    }, []);

    useEffect(() => {
        if (auth) {
            localStorage.setItem("s", JSON.stringify(auth, null, 2));
        } else {
            localStorage.removeItem("s");
        }
    }, [auth]);

    return (
        <AuthContext.Provider value={client}>
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
            <Route path="/admin/idle" exact component={IdleEffects} />
            <Route path="/admin/dgang" exact component={DGang} />
            <Route path="/admin/users" exact component={UsersList} />
            <Redirect to="/admin" />
        </PageWrapper>
    );
}
