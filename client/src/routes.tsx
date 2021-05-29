import React, { useEffect, useMemo, useState, useContext } from "react";
import { BrowserRouter as Router, Switch, Route, Redirect, useHistory } from "react-router-dom";
import { Complete } from "./pages/CardScanner";
import { User, RGBClient, serverPath } from "rgb-navigation-api";
import { Overview } from "./pages/LiveOverview";
import { AuthContext } from "./AuthContext";
import { PageWrapper } from "./components/PageWrapper";
import { DGang } from "./pages/DGang";
import { Effects } from "./pages/Effects";
import { LedController } from "./pages/LedController";
import { ApiKeys } from "./pages/ApiKeys";
import { GiveAdmin } from "./pages/Users";
import { EffectEditor } from "./pages/EffectEditor";

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
                <Route path="/realtime" exact component={Overview} />
                <Route>
                    <PageWrapper>
                        <Switch>
                            <Route path="/" exact component={Complete} />
                            <Route path="/effects/mine" exact>
                                <Effects userOnly />
                            </Route>
                            <Route path="/effects/all" exact>
                                <Effects />
                            </Route>
                            <Route path="/effects/:id" exact component={EffectEditor} />
                            <Route path="/effects">
                                <Redirect to="/effects/mine" />
                            </Route>
                            <Route path="/admin" component={AdminRouter} />
                            <Redirect to="/" />
                        </Switch>
                    </PageWrapper>
                </Route>
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
        <Switch>
            {<Route path="/admin/dgang" exact component={DGang} />}
            <Route path="/admin/ledcontrol" exact component={LedController} />
            <Route path="/admin/apikeys" exact component={ApiKeys} />
            <Route path="/admin/users" exact component={GiveAdmin} />
            <Redirect to="/effects" />
        </Switch>
    );
}
