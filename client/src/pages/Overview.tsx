import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useContext, useEffect, useState } from "react";
import { RouteComponentProps } from "react-router";
import { AuthContext } from "../AuthContext";
import { SocketContext } from "../SocketContext";

export function Overview(props: RouteComponentProps<{ roomId: string }>) {
    let { socket } = useContext(AuthContext);
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
        <div className="flex-col flex h-full">
            <ul className="ml-10 mt-10 flex flex-col flex-grow overflow-hidden flex-wrap">
                <Usercolor name="Wydooghe Michiel" color="red" />
                <Usercolor name="Dierickx Robbe" color="yellow" />
                <Usercolor name="Rogiest Stijn" color="blue" />
                <Usercolor name="Dedapper Dylan" color="green" />
                <Usercolor name="Wydooghe Michiel" color="red" />
                <Usercolor name="Dierickx Robbe" color="yellow" />
                <Usercolor name="Rogiest Stijn" color="blue" />
                <Usercolor name="Dedapper Dylan" color="green" />
                <Usercolor name="Wydooghe Michiel" color="red" />
                <Usercolor name="Dierickx Robbe" color="yellow" />
                <Usercolor name="Rogiest Stijn" color="blue" />
                <Usercolor name="Dedapper Dylan" color="green" />
            </ul>
            <div className="bg-red-700 text-white mt-auto p-8 font-bold text-5xl overflow-hidden flex-shrink-0">
                <div className="error-shake">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="transform scale-125 mr-7 opacity-75" />
                    stijns code is kapot
                </div>
            </div>
        </div>
    );
}

function Usercolor(props: { name: string; color: string }) {
    return (
        <li className="flex items-center mb-10">
            <span className="text-5xl">
                <span className="font-bold">{props.name}</span> <span className="font-bold opacity-50">volgt</span>
            </span>
            <div className="w-10 h-10 rounded-full ml-6" style={{ backgroundColor: props.color }}></div>
        </li>
    );
}
