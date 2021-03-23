import React, { useContext, useEffect, useState } from "react";
import { RouteComponentProps } from "react-router";
import { SocketContext } from "./socketContext";

export function Overview(props: RouteComponentProps<{ roomId: string }>) {
    let { socket } = useContext(SocketContext);
    let [messages, setMessages] = useState<string[]>([]);

    async function onNfcAlreadyBound() {
        setMessages((messages) => [...messages, "Already bound"]);
    }

    async function onNfcUnknownScanned() {
        setMessages((messages) => [...messages, "Unknown scanned"]);
    }

    async function onUserShouldFollow(data: any) {
        setMessages((messages) => [...messages, data.name + " should follow ?"]);
    }

    useEffect(() => {
        socket.on("nfcAlreadyBound", onNfcAlreadyBound);
        socket.on("nfcUnknownScanned", onNfcUnknownScanned);
        socket.on("userShouldFollow", onUserShouldFollow);
        socket.on("connect", () => {
            socket.emit("subscribe", { roomId: props.match.params.roomId });
        });
        socket.emit("subscribe", { roomId: props.match.params.roomId });
        return () => {
            socket.off("nfcAlreadyBound", onNfcAlreadyBound);
            socket.off("nfcUnknownScanned", onNfcUnknownScanned);
            socket.off("userShouldFollow", onUserShouldFollow);
        };
    }, []);

    return (
        <div className="flex justify-center">
            <div className="w-72 m-5  border border-gray-200 rounded" style={{ minHeight: "200px" }}>
                <h2 className="font-semibold px-5 py-3 border-b border-gray-200">
                    <span className="h-2.5 w-2.5 mr-1 inline-block bg-red-600 rounded-full" style={{ animation: "blinking linear 2s infinite" }} />{" "}
                    Events
                </h2>
                <ul className="px-5 py-3">
                    {messages.map((e, i) => (
                        <li key={i}>{e}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
