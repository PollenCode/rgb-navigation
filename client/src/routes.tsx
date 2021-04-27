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

export function Routes() {
    const client = useMemo(() => new RGBClient(), []);
    const [auth, setAuth] = useState<Auth | undefined>(undefined);
    const history = useHistory();

    useEffect(() => {
        client.on("auth", setAuth);
        return () => {
            client.off("auth", setAuth);
        };
    }, []);

    // useEffect(() => {
    //     const query = new URLSearchParams(window.location.search);
    //     let token = query.get("s") || localStorage.getItem("s");
    //     if (!token) {
    //         // Redirect to auth
    //         window.location.href = serverPath;
    //     } else {
    //         setAuth(token);
    //         localStorage.setItem("s", token);
    //         // Remove query string
    //         history.push(history.location.pathname);
    //     }
    // }, []);

    // if (!auth) {
    //     return null;
    // }

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
