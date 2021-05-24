import React, { useContext, useEffect, useMemo, useState } from "react";
import { RouteComponentProps } from "react-router";
import { AuthContext } from "../AuthContext";
import { Button } from "../components/Button";
import { serverPath } from "rgb-navigation-api";
import { SocketContext } from "../SocketContext";

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

export function Complete() {
    const client = useContext(AuthContext);
    let [status, setStatus] = useState<Status>("loading");

    useEffect(() => {
        function tryBind() {
            client.socket.emit("bind", { roomId: "dgang", token: client.accessToken }, (res: any) => {
                if (res.status === "busy" || res.status === "error") {
                    console.log("bind is busy, trying again in 4 seconds", res);
                    setTimeout(tryBind, 3000 + Math.random() * 2000);
                    setStatus("waiting-for-others");
                } else if (res.status === "ok") {
                    setStatus("scan");
                }
            });
        }
        if (!client.user) {
            setStatus("loading");
        } else if (client.user.identifier) {
            setStatus("bound");
        } else {
            tryBind();
        }
    }, [client.user, client.user?.identifier]);

    useEffect(() => {
        async function onNfcAlreadyBound() {
            setStatus("already-bound");
            setTimeout(() => setStatus("scan"), 2000);
        }
        async function onNfcBound(data: any) {
            client.setUser({ ...client.user!, identifier: data.identifier });
            // setUser((user: any) => ({ ...user, identifier: data.identifier }));
            setStatus("bound");
        }
        async function onUserFollow() {
            // TODO
            console.log("User should follow line");
            setStatus("bound");
        }

        client.socket.on("nfcAlreadyBound", onNfcAlreadyBound);
        client.socket.on("nfcBound", onNfcBound);
        client.socket.on("userShouldFollow", onUserFollow);
        return () => {
            client.socket.off("nfcAlreadyBound", onNfcAlreadyBound);
            client.socket.off("nfcBound", onNfcBound);
            client.socket.off("userShouldFollow", onUserFollow);
        };
    }, []);

    if (!client.user) return null;

    return (
        <div className="items-center justify-center flex flex-col flex-grow">
            <h1 className="text-3xl px-5 py-3 my-3 bg-green-500 text-white border rounded-lg">{getTextForStatus(status)}</h1>
            <h2 className="text-lg font-semibold text-blue-700">{client.user.name}</h2>
            <h3>{client.user.email}</h3>
            {/* {auth.picture && <img className="rounded m-3" src={user.picture} alt="profile" />} */}
            {client.user.identifier && (
                <Button
                    style={{ margin: "1em 0" }}
                    onClick={async () => {
                        await client.unbind();
                        client.setUser({ ...client.user!, identifier: null });
                    }}>
                    Verbreken
                </Button>
            )}
        </div>
    );
}
