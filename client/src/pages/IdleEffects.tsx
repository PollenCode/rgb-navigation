import { Button } from "../components/Button";
import { RouteComponentProps } from "react-router";
import { serverPath } from "rgb-navigation-api";
import { LedControllerServerMessage } from "rgb-navigation-api";
import { useContext } from "react";
import { AuthContext } from "../AuthContext";

export function IdleEffects() {
    let client = useContext(AuthContext);
    return (
        <div className="flex items-center flex-col min-h-screen justify-center">
            <h1 className="text-4xl font-bold mb-8">Idle Effecten</h1>
            <Button
                style={{ margin: "0.5em" }}
                type="button"
                onClick={async () => {
                    await client.sendIdleEffect(0);
                }}>
                Zwart
            </Button>
            <Button
                style={{ margin: "0.5em" }}
                type="button"
                onClick={async () => {
                    await client.sendIdleEffect(1);
                }}>
                Regenboog
            </Button>
        </div>
    );
}
