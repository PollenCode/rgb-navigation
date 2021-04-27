import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../AuthContext";
import { Button } from "../components/Button";

interface Effect {
    name: string;
    code: string;
    id: number;
    author?: {
        name: string;
        email: string;
    };
}

function CustomEffect(props: { effect: Effect }) {
    return (
        <li className="border-b last:border-0 text-gray-700 py-2 px-4 hover:bg-blue-100 transition cursor-pointer">
            <span className="font-semibold">{props.effect.name}</span>
            {props.effect.author && (
                <span className="ml-1.5 text-sm text-gray-400" title={props.effect.author.email}>
                    (door {props.effect.author.name})
                </span>
            )}
        </li>
    );
}

const DEFAULT_CODE = `

#include "../leds.h"

void effect() {

    // Your effect code here.

}

`;

export function CustomEffects() {
    const client = useContext(AuthContext);
    const [effects, setEffects] = useState<Effect[] | undefined>();

    useEffect(() => {
        client.getEffects().then(setEffects);
    }, []);

    console.log("effects", effects);

    if (!effects) {
        return <p>loading...</p>;
    }

    return (
        <div className="flex justify-center px-1 md:px-4 pt-4">
            <div style={{ width: "800px" }}>
                <Button
                    onClick={async () => {
                        let name = prompt("Geef je nieuwe effect een naam");
                        if (!name) return;
                        let newEffect = await client.createEffect({ code: DEFAULT_CODE, name: name });
                        setEffects([...effects, newEffect]);
                    }}>
                    Nieuw effect maken
                </Button>
                <ul className="mt-4 border-collapse border rounded overflow-hidden">
                    {effects.map((e) => (
                        <CustomEffect key={e.id} effect={e} />
                    ))}
                </ul>
            </div>
        </div>
    );
}
