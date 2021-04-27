import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter as Router, Switch, Route, Redirect, useHistory } from "react-router-dom";
import { Admin } from "./pages/Admin";
import { Complete } from "./pages/Complete";
import { User, RGBClient, serverPath } from "rgb-navigation-api";
import { Overview } from "./pages/Overview";
import { UsersList } from "./Users";
import { AuthContext } from "./AuthContext";
import { PageWrapper } from "./components/PageWrapper";
import { DGang } from "./pages/DGang";
import { EffectEdit, Effects } from "./pages/Effects";

const client = new RGBClient();

export function Routes() {
    const query = new URLSearchParams(window.location.search);
    const [user, setUser] = useState<User | undefined>(undefined);
    const history = useHistory();

    useEffect(() => {
        function onAuth(user: User | undefined, token?: string) {
            setUser(user);

            if (token) {
                localStorage.setItem("s", token);
            } else {
                localStorage.removeItem("s");
            }
        }

        client.on("auth", onAuth);

        if (query.has("s")) {
            let accessToken = query.get("s")!;
            client.setAccessToken(accessToken);
        } else if (localStorage.getItem("s")) {
            client.setAccessToken(localStorage.getItem("s")!);
        } else {
            // Redirect to oauth
            window.location.href = serverPath;
        }

        return () => {
            client.off("auth", onAuth);
        };
    }, []);

    if (!user) {
        return <p>logged out, refresh the page to log in</p>;
    }

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
            <Switch>
                <Route path="/admin" exact component={Admin} />
                <Route path="/admin/overview/:roomId" exact component={Overview} />
                <Route path="/admin/effects/:id" exact component={EffectEdit} />
                <Route path="/admin/effects" exact component={Effects} />
                <Route path="/admin/dgang" exact component={DGang} />
                <Route path="/admin/users" exact component={UsersList} />
                <Redirect to="/admin" />
            </Switch>
        </PageWrapper>
    );
}
