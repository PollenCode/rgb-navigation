import React, { useEffect, useMemo, useState, useContext } from "react";
import { BrowserRouter as Router, Switch, Route, Redirect, useHistory } from "react-router-dom";
import { Complete } from "./pages/Complete";
import { User, RGBClient, serverPath } from "rgb-navigation-api";
import { Overview } from "./pages/Overview";
import { AuthContext } from "./AuthContext";
import { PageWrapper } from "./components/PageWrapper";
import { DGang } from "./pages/DGang";
import { EffectEdit, Effects } from "./pages/Effects";
import { LedController } from "./pages/LedController";
import { Token } from "./pages/Token";
import { GiveAdmin } from "./pages/GiveAdmin";

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

            if (!user) {
                window.location.href = serverPath + "/api/oauth";
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
            window.location.href = serverPath + "/api/oauth";
        }

        return () => {
            client.off("auth", onAuth);
        };
    }, []);

    if (!user) {
        return null;
    }

    return (
        <AuthContext.Provider value={client}>
            <Switch>
                <Route path="/" exact component={Complete} />
                <Route path="/realtime" exact component={Overview} />
                <Route path="/admin" component={AdminRouter} />
                <Redirect to="/" />
            </Switch>
        </AuthContext.Provider>
    );
}

function AdminRouter() {
    const history = useHistory();
    const client = useContext(AuthContext);

    if (client.user && !client.user.admin) {
        history.push("/");
        return <p></p>;
    }

    return (
        <PageWrapper>
            <Switch>
                <Route path="/admin/effects/:id" exact component={EffectEdit} />
                <Route path="/admin/effects" exact component={Effects} />
                <Route path="/admin/dgang" exact component={DGang} />
                <Route path="/admin/ledcontrol" exact component={LedController} />
                <Route path="/admin/token" exact component={Token} />
                <Route path="/admin/users" exact component={GiveAdmin} />
                <Redirect to="/admin/effects" />
            </Switch>
        </PageWrapper>
    );
}
