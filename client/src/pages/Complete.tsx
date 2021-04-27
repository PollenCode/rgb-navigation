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
    const { auth, socket, setAuth, unbind } = useContext(AuthContext);
    let [status, setStatus] = useState<Status>("loading");

    // useEffect(() => {
    //     async function fetchUser() {
    //         let res = await fetch(serverPath + "/api/user", {
    //             method: "POST",
    //             headers: { Authorization: `Bearer ${client}` },
    //         });
    //         let data = await res.json();
    //         if (data.status === "ok") {
    //             setUser(data.user);
    //         }
    //     }
    //     fetchUser();
    // }, [client]);

    useEffect(() => {
        function tryBind() {
            socket.emit("bind", { roomId: "dgang", token: auth!.accessToken }, (res: any) => {
                if (res.status === "busy" || res.status === "error") {
                    console.log("bind is busy, trying again in 4 seconds", res);
                    setTimeout(tryBind, 3000 + Math.random() * 2000);
                    setStatus("waiting-for-others");
                } else if (res.status === "ok") {
                    setStatus("scan");
                }
            });
        }
        if (!auth) {
            setStatus("loading");
        } else if (auth.identifier) {
            setStatus("bound");
        } else {
            tryBind();
        }
    }, [auth]);

    useEffect(() => {
        async function onNfcAlreadyBound() {
            setStatus("already-bound");
            setTimeout(() => setStatus("scan"), 2000);
        }
        async function onNfcBound(data: any) {
            setAuth({ ...auth!, identifier: data.identifier });
            // setUser((user: any) => ({ ...user, identifier: data.identifier }));
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

    if (!auth) return null;

    return (
        <div className="items-center justify-center min-h-screen flex flex-col">
            <h1 className="text-3xl px-5 py-3 my-3 bg-green-500 text-white border rounded-lg">{getTextForStatus(status)}</h1>
            <h2 className="text-lg font-semibold text-blue-700">{auth.name}</h2>
            <h3>{auth.email}</h3>
            {/* {auth.picture && <img className="rounded m-3" src={user.picture} alt="profile" />} */}
            {auth.identifier && (
                <Button
                    style={{ margin: "1em 0" }}
                    onClick={async () => {
                        await unbind();
                        setAuth({ ...auth!, identifier: null });
                    }}>
                    Verbreken
                </Button>
            )}
        </div>
    );
}
