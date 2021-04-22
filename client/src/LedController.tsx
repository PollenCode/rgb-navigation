import { Button } from "./components/Button";
import { RouteComponentProps } from "react-router";
import { serverPath } from "./helpers";
import { LedControllerServerMessage } from "../../shared/Message";
let accessToken: any;

async function sendMessage(room: number){
    let req: LedControllerServerMessage = {
        type: "roomEffect",
        room: room
    };
    await fetch(serverPath + "/api/leds", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(req),
    });
}


export function LedController(props: RouteComponentProps<{ token: string }>) {
    accessToken = decodeURIComponent(props.match.params.token);
    return (
        <div className="flex items-center flex-col min-h-screen justify-center">
            <h1 className="text-4xl font-bold mb-8">D-Gang</h1>
            <div className="flex items-center justify-center  flex-row">  
                <div className="flex items-center flex-col ">  
                    <Button
                        style={{ margin: "0.5em" }}
                        type="button"
                        onClick={async () => {
                            sendMessage(0);
                        }}>
                        Lokaal 1
                    </Button>
                    <Button
                        style={{ margin: "0.5em" }}
                        type="button"
                        onClick={async () => {
                            sendMessage(1);
                        }}>
                        Lokaal 2
                    </Button>
                    <Button
                        style={{ margin: "0.5em" }}
                        type="button"
                        onClick={async () => {
                            sendMessage(2);
                        }}>
                        Lokaal 3
                    </Button>
                </div>
                <div className="flex items-center flex-col">
                    <Button
                        style={{ margin: "0.5em" }}
                        type="button"
                        onClick={async () => {
                            sendMessage(3);
                        }}>
                        Lokaal 4
                    </Button>
                    <Button
                        style={{ margin: "0.5em" }}
                        type="button"
                        onClick={async () => {
                            sendMessage(4);
                        }}>
                        Lokaal 5
                    </Button>
                    <Button
                        style={{ margin: "0.5em" }}
                        type="button"
                        onClick={async () => {
                            sendMessage(5);
                        }}>
                        Lokaal 6
                    </Button>
                </div>
            </div>
        </div>
        
    );
}