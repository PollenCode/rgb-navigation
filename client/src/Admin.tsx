import { useHistory } from "react-router";
import { LedControllerServerMessage } from "../../shared/Message";
import { Button } from "./components/Button";
import { isDevelopment } from "./helpers";

export function Admin() {
    const history = useHistory();
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Button
                style={{ margin: "0.5em" }}
                onClick={() => {
                    window.location.href = isDevelopment ? "http://localhost:3001/" : "/";
                }}>
                OAuth authenticate
            </Button>

            <Button style={{ margin: "0.5em" }} onClick={() => history.push("/overview/dgang")}>
                Overview dgang
            </Button>

            <Button
                disabled
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
                    await fetch(isDevelopment ? "http://localhost:3001/api/leds" : "/api/leds", {
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
