import React, { useContext, useEffect, useState } from "react";
import { RouteComponentProps } from "react-router";
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { Button } from "../components/Button";
import Editor, { DiffEditor, useMonaco, loader } from "@monaco-editor/react";

interface Effect {
    name: string;
    code: string;
    id: number;
    author?: {
        name: string;
        email: string;
    };
}

function CustomEffectItem(props: { effect: Effect }) {
    return (
        <Link to={`/admin/effects/${props.effect.id}`}>
            <li className="border-b last:border-0 text-gray-700 py-2 px-4 hover:bg-blue-100 transition cursor-pointer">
                <span className="font-semibold">{props.effect.name}</span>
                {props.effect.author && (
                    <span className="ml-1.5 text-sm text-gray-400" title={props.effect.author.email}>
                        (door {props.effect.author.name})
                    </span>
                )}
            </li>
        </Link>
    );
}

const DEFAULT_CODE = `

#include "../leds.h"

void effect() {

    // Your effect code here.

}

`;

export function CustomEffectsPage() {
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
                        <CustomEffectItem key={e.id} effect={e} />
                    ))}
                </ul>
            </div>
        </div>
    );
}

export function CustomEffectPage(props: RouteComponentProps<{ id: string }>) {
    const client = useContext(AuthContext);
    const [effect, setEffect] = useState<Effect>();
    const [code, setCode] = useState<string>();

    useEffect(() => {
        client.getEffect(parseInt(props.match.params.id)).then(setEffect);
    }, []);

    useEffect(() => {
        if (effect) setCode(effect.code);
    }, [effect]);

    if (!effect) {
        return <p>loading...</p>;
    }

    return (
        <div className="h-full overflow-hidden">
            <div className="py-2 px-4 border-b font-semibold text-gray-600">{effect.name}</div>
            <div className="h-full relative overflow-hidden">
                <Editor defaultLanguage="cpp" theme="vs-dark" value={code} onChange={(ev) => setCode(ev)} />
            </div>
        </div>
    );
}
