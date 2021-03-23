import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { LedControllerServerMessage } from "../../shared/Message";
import { Button } from "./components/Button";
import { isDevelopment } from "./helpers";

export function App() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Button
                onClick={() => {
                    window.location.href = isDevelopment ? "http://localhost:3001/" : "/";
                }}>
                Authenticate
            </Button>

            <Button
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
                    await fetch(isDevelopment ? "http://localhost:3001/leds" : "/leds", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(req),
                    });
                }}>
                Set color
            </Button>
        </div>
    );
}
