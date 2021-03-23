import React, { useContext, useEffect, useMemo, useState } from "react";
import { RouteComponentProps } from "react-router";
import { Button } from "./components/Button";
import { SocketContext } from "./socketContext";

type Status = "bound" | "loading" | "waiting-for-others" | "scan" | "already-bound";

function getTextForStatus(status: Status) {
    switch (status) {
        case "scan":
            return "Scan je kaart";
        case "waiting-for-others":
            return "Je staat in de rij";
        case "bound":
            return "Verbonden";
        case "loading":
            return "Laden...";
        case "already-bound":
            return "Kaart al verbonden!";
    }
}

export function Complete(props: RouteComponentProps<{ token: string }>) {
    let accessToken = decodeURIComponent(props.match.params.token);
    let [user, setUser] = useState<any>();
    let { socket } = useContext(SocketContext);
    let [status, setStatus] = useState<Status>("loading");

    useEffect(() => {
        async function fetchUser() {
            let res = await fetch("http://localhost:3001/api/user", {
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
            socket.emit("bind", { roomId: "dgang", token: accessToken }, (res: any) => {
                if (res.status === "busy" || res.status === "error") {
                    console.log("bind is busy, trying again in 4 seconds", res);
                    setTimeout(tryBind, 3000 + Math.random() * 2000);
                    setStatus("waiting-for-others");
                } else if (res.status === "ok") {
                    setStatus("scan");
                }
            });
        }
        if (!user) {
            setStatus("loading");
        } else if (user.identifier) {
            setStatus("bound");
        } else {
            tryBind();
        }
    }, [user]);

    useEffect(() => {
        async function onNfcAlreadyBound() {
            setStatus("already-bound");
            setTimeout(() => setStatus("scan"), 2000);
        }
        async function onNfcBound(data: any) {
            setUser((user: any) => ({ ...user, identifier: data.identifier }));
            setStatus("bound");
        }
        async function onUserFollow() {
            // TODO
            console.log("User should follow line");
            setStatus("bound");
        }

        socket.on("nfcAlreadyBound", onNfcAlreadyBound);
        socket.on("nfcBound", onNfcBound);
        socket.on("userShouldFollow", onUserFollow);
        return () => {
            socket.off("nfcAlreadyBound", onNfcAlreadyBound);
            socket.off("nfcBound", onNfcBound);
            socket.off("userShouldFollow", onUserFollow);
        };
    }, []);

    if (!user) return null;

    return (
        <div className="items-center justify-center min-h-screen flex flex-col">
            <h1 className="text-3xl px-5 py-3 my-3 bg-green-500 text-white border rounded-lg">{getTextForStatus(status)}</h1>
            <h2 className="text-lg font-semibold text-blue-700">{user.name}</h2>
            <h3>{user.email}</h3>
            {user.picture && <img className="rounded m-3" src={user.picture} alt="profile" />}
            {user.identifier && (
                <Button
                    style={{ margin: "1em 0" }}
                    onClick={async () => {
                        let res = await fetch("http://localhost:3001/api/unbind", {
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
        </div>
    );
}
