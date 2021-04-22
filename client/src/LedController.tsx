import { Button } from "./components/Button";
import { RouteComponentProps } from "react-router";
import { serverPath } from "./helpers";
import { LedControllerServerMessage } from "../../shared/Message";


export function LedController(props: RouteComponentProps<{ token: string }>) {
    let accessToken = decodeURIComponent(props.match.params.token);
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Button
                style={{ margin: "0.5em" }}
                type="button"
                onClick={async () => {
                    let req: LedControllerServerMessage = {
                        type: "roomEffect",
                        room: 0
                    };
                    await fetch(serverPath + "/api/leds", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                        body: JSON.stringify(req),
                    });
                }}>
                Lokaal 1
            </Button>
            <Button
                style={{ margin: "0.5em" }}
                type="button"
                onClick={async () => {
                    let req: LedControllerServerMessage = {
                        type: "roomEffect",
                        room: 1
                    };
                    await fetch(serverPath + "/api/leds", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                        body: JSON.stringify(req),
                    });
                }}>
                Lokaal 2
            </Button>
            <Button
                style={{ margin: "0.5em" }}
                type="button"
                onClick={async () => {
                    let req: LedControllerServerMessage = {
                        type: "roomEffect",
                        room: 2
                    };
                    await fetch(serverPath + "/api/leds", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                        body: JSON.stringify(req),
                    });
                }}>
                Lokaal 3
            </Button>
            <Button
                style={{ margin: "0.5em" }}
                type="button"
                onClick={async () => {
                    let req: LedControllerServerMessage = {
                        type: "roomEffect",
                        room: 3
                    };
                    await fetch(serverPath + "/api/leds", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                        body: JSON.stringify(req),
                    });
                }}>
                Lokaal 4
            </Button>
            <Button
                style={{ margin: "0.5em" }}
                type="button"
                onClick={async () => {
                    let req: LedControllerServerMessage = {
                        type: "roomEffect",
                        room: 4
                    };
                    await fetch(serverPath + "/api/leds", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                        body: JSON.stringify(req),
                    });
                }}>
                Lokaal 5
            </Button>
            <Button
                style={{ margin: "0.5em" }}
                type="button"
                onClick={async () => {
                    let req: LedControllerServerMessage = {
                        type: "roomEffect",
                        room: 5
                    };
                    await fetch(serverPath + "/api/leds", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                        body: JSON.stringify(req),
                    });
                }}>
                Lokaal 6
            </Button>


        </div>
    );
}