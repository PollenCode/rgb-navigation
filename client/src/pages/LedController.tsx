import { Button } from "../components/Button";
import { AuthContext } from "../AuthContext";
import { useContext } from "react";
import { useState } from "react";

const MAX_LEDS = "784";

export function LedController() {
    let client = useContext(AuthContext);
    const [startLed, setStartLed] = useState("0");
    const [endLed, setEndLed] = useState("50");
    const [duration, setDuration] = useState("1");
    const [color, setColor] = useState("0");

    return (
        <div className="flex items-center flex-col min-h-screen justify-center">
            <h1 className="text-4xl font-bold mb-8">LedController</h1>
            <div className="flex flex-row">
                <p className="mr-5 text-lg">Start led:</p>
                <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    min="0"
                    max={MAX_LEDS}
                    defaultValue="0"
                    onChange={(event) => setStartLed(event.target.value)}
                    className="border-black h-5 mr-5 "></input>
                <p className="mr-5 text-lg">End led:</p>
                <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    min="0"
                    max={MAX_LEDS}
                    defaultValue={MAX_LEDS}
                    onChange={(event) => setEndLed(event.target.value)}
                    className="border-black h-5 mr-5 "></input>
                <p className="mr-5 text-lg">Tijd:</p>
                <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    min="1"
                    defaultValue="1"
                    onChange={(event) => setDuration(event.target.value)}
                    className="border-black h-5 mr-5 "></input>
                <p className="mr-5 text-lg">Kleur:</p>
                <input type="color" onChange={(event) => setColor(event.target.value)}></input>
                <Button
                    style={{ margin: "0.5em" }}
                    type="button"
                    onClick={async () => {
                        client.enableLedRoute(Number(startLed), Number(endLed), Number(duration), color);
                    }}>
                    Verzenden
                </Button>
            </div>
        </div>
    );
}
