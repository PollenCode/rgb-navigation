import { access } from "node:fs";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { RouteComponentProps } from "react-router";
import { Button } from "./components/Button";
import { SocketContext } from "./socketContext";

type Status = "bound" | "loading" | "waitingForOthers" | "scan";

function getTextForStatus(status: Status) {
    switch (status) {
        case "scan":
            return "Scan je kaart.";
        case "waitingForOthers":
            return "Je staat in de rij.";
        case "bound":
            return "Al verbonden";
        case "loading":
            return "Laden...";
    }
}

export function Complete(props: RouteComponentProps<{ id: string }>) {
    let { accessToken } = useMemo(() => JSON.parse(atob(decodeURIComponent(props.match.params.id))), [props.match.params.id]);
    let [user, setUser] = useState<any>();
    let { socket } = useContext(SocketContext);
    let [status, setStatus] = useState<Status>("loading");

    useEffect(() => {
        async function fetchUser() {
            let res = await fetch("http://localhost:3001/user", {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            let data = await res.json();
            if (data.status === "ok") {
                setUser(data.user);
            }
        }
        fetchUser();
    }, [accessToken]);

    useEffect(() => {
        function tryBind() {
            setStatus("loading");
            socket.emit("bind", { roomId: "dgang", token: accessToken }, (res: any) => {
                if (res.status === "busy" || res.status === "error") {
                    console.log("bind is busy, trying again in 2 seconds", res);
                    setTimeout(tryBind, 2000 + Math.random() * 1000);
                    setStatus("waitingForOthers");
                } else if (res.status === "ok") {
                    setStatus("scan");
                }
            });
        }
        if (!user) {
            setStatus("loading");
        } else if (!user.identifier) {
            tryBind();
        } else {
            setStatus("bound");
        }
    }, [user]);

    if (!user) return null;

    return (
        <div className="items-center justify-center min-h-screen flex flex-col">
            <h1 className="text-3xl px-5 py-3 my-3 bg-green-500 text-white border rounded-lg">{getTextForStatus(status)}</h1>
            <h2 className="text-lg font-semibold text-blue-700">{user.name}</h2>
            <h3>{user.email}</h3>
            {user.picture && <img className="rounded m-3" src={user.picture} alt="profile" />}
            {user.identifier && (
                <Button
                    onClick={async () => {
                        let res = await fetch("http://localhost:3001/unbind", {
                            method: "POST",
                            headers: { Authorization: `Bearer ${accessToken}` },
                        });
                        let data = await res.json();
                        if (data.status === "ok") {
                            setUser(data.user);
                        }
                    }}>
                    Verbreken
                </Button>
            )}

            {/* <Button
                onClick={async () => {
                    let res = await fetch("http://localhost:3001/user", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${accessToken}` },
                    });
                    let data = await res.json();
                    console.log(data);
                    alert(JSON.stringify(data, null, 2));
                }}>
                Get user info
            </Button> */}
        </div>
    );
}
