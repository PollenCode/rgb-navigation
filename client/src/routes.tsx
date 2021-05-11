import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter as Router, Switch, Route, Redirect, useHistory } from "react-router-dom";
import { Admin } from "./pages/Admin";
import { Complete } from "./pages/Complete";
import { User, RGBClient, serverPath } from "rgb-navigation-api";
import { Overview } from "./pages/Overview";
import { AuthContext } from "./AuthContext";
import { PageWrapper } from "./components/PageWrapper";
import { DGang } from "./pages/DGang";
import { EffectEdit, Effects } from "./pages/Effects";
import { LedController } from "./pages/LedController";
import { Token } from "./pages/Token";
import { GiveAdminAll } from "./pages/giveAdminAll";
import { GiveAdmin } from "./pages/giveAdmin";

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

            if (!token) {
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
                <Route path="/admin" component={AdminRouter} />
                <Route path="/giveAdminAll" component={GiveAdminAll} />
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
                <Route path="/admin/ledcontrol" exact component={LedController} />
                <Route path="/admin/token" exact component={Token} />
                <Route path="/admin/giveAdmin" exact component={GiveAdmin} />
                <Redirect to="/admin" />
            </Switch>
        </PageWrapper>
    );
}
