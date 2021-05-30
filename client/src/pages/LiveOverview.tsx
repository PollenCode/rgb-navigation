import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useContext, useEffect, useState } from "react";
import { RouteComponentProps } from "react-router";
import { Effect } from "rgb-navigation-api";
import { AuthContext } from "../AuthContext";
import { SocketContext } from "../SocketContext";

export function Overview(props: RouteComponentProps<{ roomId: string }>) {
    const client = useContext(AuthContext);
    const [messages, setMessages] = useState<{ name: string; color: string }[]>([]);
    const [error, setError] = useState<string>();
    const [activeEffect, setActiveEffect] = useState<Effect>();

    async function onNfcAlreadyBound() {
        setError("kaart al gelinkt");
        setTimeout(() => {
            setError("");
        }, 15000);
    }

    async function onNfcUnknownScanned() {
        setError("onbekende kaart gescanned");
        setTimeout(() => {
            setError("");
        }, 15000);
    }

    async function onUserShouldFollow(data: any) {
        console.log(data);
        setMessages((messages) => [data, ...messages]);
        setTimeout(() => {
            setMessages((messages) => messages.slice(0, messages.length - 1));
        }, 30000);
    }

    async function onActiveEffect({ activeEffectId, carrouselInterval }: { activeEffectId: number; carrouselInterval: number }) {
        client.getEffect(activeEffectId).then(setActiveEffect);
    }

    useEffect(() => {
        client.socket.on("nfcAlreadyBound", onNfcAlreadyBound);
        client.socket.on("nfcUnknownScanned", onNfcUnknownScanned);
        client.socket.on("userShouldFollow", onUserShouldFollow);
        client.socket.on("activeEffect", onActiveEffect);
        client.socket.on("connect", () => {
            client.socket.emit("subscribe", { roomId: "dgang" });
        });
        client.socket.emit("subscribe", { roomId: "dgang" });
        return () => {
            client.socket.off("nfcAlreadyBound", onNfcAlreadyBound);
            client.socket.off("nfcUnknownScanned", onNfcUnknownScanned);
            client.socket.off("userShouldFollow", onUserShouldFollow);
            client.socket.off("activeEffect", onActiveEffect);
        };
    }, []);

    return (
        <div className="flex flex-col h-screen">
            <div className="flex flex-grow">
                <div className="flex-col flex flex-grow">
                    {messages.length === 0 ? (
                        <p className="flex flex-grow justify-center items-center text-6xl opacity-10 font-bold">Wachten op kaart...</p>
                    ) : (
                        <ul className="ml-10 mt-10 flex flex-col flex-grow overflow-hidden flex-wrap">
                            {messages.map((e) => (
                                <Usercolor key={e.name + e.color} name={e.name} color={e.color} />
                            ))}
                        </ul>
                    )}
                </div>
                <div className="px-10 py-8 bg-gray-200 flex flex-col" style={{ width: "420px", maxWidth: "420px" }}>
                    <h1 className="font-bold text-5xl text-right">
                        Ga naar <span className="text-blue-600">rgb.ikdoeict.be</span>
                    </h1>
                    <img className="w-full my-8" src="/qr.png" alt="" style={{ imageRendering: "pixelated" }} />
                    {activeEffect && (
                        <div className="mt-auto opacity-50 text-3xl text-right">
                            <h2 className="font-bold">Actief effect</h2>
                            <p>{activeEffect.name}</p>
                            {activeEffect.author && <p className="text-2xl">Door {activeEffect.author.name}</p>}
                        </div>
                    )}
                </div>
            </div>
            {error && (
                <div className="bg-red-700 text-white mt-auto p-8 font-bold text-6xl overflow-hidden flex-shrink-0 shadow-lg z-10 animate-red">
                    <div className="error-shake">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="transform scale-125 mr-7 opacity-75" />
                        {error}
                    </div>
                </div>
            )}
        </div>
    );
}

function Usercolor(props: { name: string; color: string }) {
    return (
        <li className="flex items-center mb-10">
            <span className="text-6xl">
                <span className="font-bold">{props.name}</span> <span className="font-bold opacity-50">volg</span>
            </span>
            <div className="w-14 h-14 rounded-full ml-6" style={{ backgroundColor: props.color }}></div>
        </li>
    );
}
