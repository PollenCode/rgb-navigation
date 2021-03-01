import React, { useEffect, useState } from "react";
import { SERVER } from "./constants";

export function App() {
    const [message, setMessage] = useState<string | null>(null);

    async function refreshMessage() {
        setMessage(null);
        try {
            let response = await fetch(SERVER + "/message", { method: "POST" });
            let obj = await response.json();
            setMessage(obj.message);
        } catch (ex) {
            setMessage(`Error: could not reach server. Is it turned on? See /app/server for instructions. (${ex})`);
        }
    }

    useEffect(() => {
        refreshMessage();
    }, []);

    return (
        <div>
            <h2>This is a react application</h2>
            <small>Open the network tab to see how the message got fetched!</small>
            <p>
                Message from server: <strong>{message ?? "Loading..."}</strong>
            </p>
            <button
                onClick={() => {
                    refreshMessage();
                }}
            >
                Refresh message 2
            </button>
            <button
                type="button"
                onClick={async () => {
                    await fetch(SERVER + "/leds", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ effect: 1 }),
                    });
                }}
            >
                Set color
            </button>
        </div>
    );
}
