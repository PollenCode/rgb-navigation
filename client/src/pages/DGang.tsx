import { LedControllerServerMessage } from "rgb-navigation-api";
import { serverPath } from "rgb-navigation-api";
import { Button } from "../components/Button";
import { AuthContext } from "../AuthContext";
import { useContext } from "react";

export function DGang() {
    let client = useContext(AuthContext);
    return (
        <div className="flex items-center flex-col min-h-screen justify-center">
            <h1 className="text-4xl font-bold mb-8">D-Gang</h1>
            <div className="flex items-center justify-center  flex-row">
                <div className="flex items-center flex-col ">
                    <Button
                        style={{ margin: "0.5em" }}
                        type="button"
                        onClick={async () => {
                            client.enableLedRoomRoute(0);
                        }}
                    >
                        D027
                    </Button>
                    <Button
                        style={{ margin: "0.5em" }}
                        type="button"
                        onClick={async () => {
                            client.enableLedRoomRoute(1);
                        }}
                    >
                        D029
                    </Button>
                    <Button
                        style={{ margin: "0.5em" }}
                        type="button"
                        onClick={async () => {
                            client.enableLedRoomRoute(2);
                        }}
                    >
                        D030
                    </Button>
                </div>
                <div className="flex items-center flex-col">
                    <Button
                        style={{ margin: "0.5em" }}
                        type="button"
                        onClick={async () => {
                            client.enableLedRoomRoute(3);
                        }}
                    >
                        D034a
                    </Button>
                    <Button
                        style={{ margin: "0.5em" }}
                        type="button"
                        onClick={async () => {
                            client.enableLedRoomRoute(4);
                        }}
                    >
                        D034b
                    </Button>
                    <Button
                        style={{ margin: "0.5em" }}
                        type="button"
                        onClick={async () => {
                            client.enableLedRoomRoute(5);
                        }}
                    >
                        D035
                    </Button>
                </div>
            </div>
        </div>
    );
}
