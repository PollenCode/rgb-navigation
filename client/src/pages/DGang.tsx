import { LedControllerServerMessage } from "../../../shared/Message";
import { serverPath } from "../helpers";
import { Button } from "../components/Button";
import { RouteComponentProps } from "react-router";

export function DGang(props: RouteComponentProps<{ token: string }>) {
    let accessToken = decodeURIComponent(props.match.params.token);
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Button
                style={{ margin: "0.5em" }}
                type="button"
                onClick={async () => {
                    let req: LedControllerServerMessage = {
                        type: "setIdleEffect",
                        effect: 0
                    };
                    await fetch(serverPath + "/api/leds", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                        body: JSON.stringify(req),
                    });
                }}>
                Set effect
            </Button>

            <Button
                style={{ margin: "0.5em" }}
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
                    await fetch(serverPath + "/api/leds", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                        body: JSON.stringify(req),
                    });
                }}>
                Set color
            </Button>
        </div>
    );
}