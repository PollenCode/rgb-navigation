import React, { useEffect, useState } from "react";
import { SERVER } from "./constants";
import { LedControllerServerMessage } from "../../shared/Message";

export function App() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <button
                type="button"
                onClick={async () => {
                    let req: LedControllerServerMessage = {
                        type: "enableLine",
                        r: 255,
                        g: 0,
                        b: 0,
                        duration: 5,
                        endLed: 30,
                        startLed: 0,
                    };
                    await fetch(SERVER + "/leds", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(req),
                    });
                }}>
                Set color
            </button>
        </div>
    );
}
