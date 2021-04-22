import { Button } from "../components/Button";
import { RouteComponentProps } from "react-router";
import { serverPath } from "../helpers";
import { LedControllerServerMessage } from "../../../shared/Message";
import { useContext } from "react";
import { AuthContext } from "../AuthContext";

let accessToken : any;

async function sendMessage(effect: number){
    let req: LedControllerServerMessage = {
        type: "setIdleEffect",
        effect: effect
    };
    await fetch(serverPath + "/api/leds", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(req),
    });
}

export function IdleEffects() {
    accessToken = useContext(AuthContext);
    return (
        <div className="flex items-center flex-col min-h-screen justify-center">
            <h1 className="text-4xl font-bold mb-8">Idle Effecten</h1>
            <Button
                style={{ margin: "0.5em" }}
                type="button"
                onClick={async () => {
                 sendMessage(0);
                }}>
                Zwart
            </Button>
            <Button
                style={{ margin: "0.5em" }}
                type="button"
                onClick={async () => {
                sendMessage(1);
            }}>
                Regenboog
            </Button>
        </div>
    );
}
