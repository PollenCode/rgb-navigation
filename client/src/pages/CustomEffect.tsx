import React, { useContext, useEffect, useState } from "react";
import { Prompt, RouteComponentProps, useHistory } from "react-router";
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { Button } from "../components/Button";
import Editor, { DiffEditor, useMonaco, loader } from "@monaco-editor/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faMagic, faSave, faTimes, faUpload } from "@fortawesome/free-solid-svg-icons";
import { ArduinoBuildMessage } from "rgb-navigation-api";

interface Effect {
    name: string;
    code: string;
    id: number;
    author?: {
        id: string;
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
        return null;
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
    const [output, setOutput] = useState<[boolean, string][]>([]);
    const [loading, setLoading] = useState(false);
    const history = useHistory();
    const readOnly = !effect || !effect.author || !client.user || client.user.id !== effect.author.id;

    useEffect(() => {
        client.getEffect(parseInt(props.match.params.id)).then(setEffect);

        function onArduinoBuild(data: ArduinoBuildMessage) {
            console.log("onArduinoBuild", data);
            if (data.type === "stderr") {
                setOutput((output) => [...output, [true, data.data]]);
            } else if (data.type === "stdout") {
                setOutput((output) => [...output, [false, data.data]]);
            } else if (data.type === "status") {
                setLoading(data.percent < 1);
            }
        }

        client.socket.on("arduinoBuild", onArduinoBuild);
        client.socket.emit("arduinoSubscribe", true);

        return () => {
            client.socket.off("arduinoBuild", onArduinoBuild);
            client.socket.emit("arduinoSubscribe", false);
        };
    }, []);

    useEffect(() => {
        if (effect) setCode(effect.code);
        // setOutput(JSON.stringify(effect, null, 2));
    }, [effect]);

    if (!effect) {
        return null;
    }

    async function updateName(name: string) {
        if (!name) return;
        setEffect(await client.updateEffect({ name: name, code: effect!.code, id: effect!.id }));
    }

    async function save() {
        setLoading(true);
        let eff = await client.updateEffect({ name: effect!.name, code: code!, id: effect!.id });
        await new Promise((res) => setTimeout(res, 500));
        setEffect(eff);
        setLoading(false);
    }

    async function build() {
        setOutput([]);
        setLoading(true);
        await client.buildEffect(effect!.id);
        await new Promise((res) => setTimeout(res, 1000));
    }

    async function activate() {
        setLoading(true);
        await client.sendIdleEffect(effect!.id);
        await new Promise((res) => setTimeout(res, 1000));
        setLoading(false);
    }

    return (
        <div className="h-full overflow-hidden relative">
            <Prompt when={effect.code !== code && !readOnly} message="Ben je zeker dat je wilt weg gaan? Je hebt onopgeslagen aanpassingen." />
            <div className="py-2 px-4 border-b font-semibold text-gray-600 flex items-center">
                <button onClick={() => history.goBack()} className="text-blue-600 pr-4">
                    <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                <input
                    defaultValue={effect.name}
                    readOnly={readOnly}
                    className="font-semibold min-w-0 flex-grow"
                    onBlur={(ev) => updateName(ev.target.value)}
                />
                {/* {effect.author && (
                        <span className="ml-1 text-sm text-gray-400" title={effect.author.email}>
                            (door {effect.author.name})
                        </span>
                    )} */}
                {readOnly && <span className="text-xs text-gray-400 ml-1">(Aleen lezen)</span>}
                {effect && (
                    <Button style={{ marginRight: "0.3em" }} loading={loading} icon={faMagic} disabled={loading} onClick={activate}>
                        Activeer
                    </Button>
                )}
                {effect && !readOnly && (
                    <Button style={{ minWidth: "120px", marginRight: "0.3em" }} loading={loading} icon={faUpload} disabled={loading} onClick={build}>
                        Upload
                    </Button>
                )}
                {effect && !readOnly && (
                    <Button style={{ minWidth: "120px" }} loading={loading} icon={faSave} disabled={loading || effect.code === code} onClick={save}>
                        Save
                    </Button>
                )}
            </div>
            <div className="h-full relative overflow-hidden fade-in">
                <Editor defaultLanguage="cpp" theme="vs-dark" value={code} onChange={(ev) => setCode(ev)} />
            </div>
            {output.length && (
                <div className="absolute bottom-0 right-0 w-full border-t bg-black bg-opacity-10 text-white" style={{ backdropFilter: "blur(8px)" }}>
                    <h2 className="font-bold px-4 py-2 flex">
                        Output
                        <span className="ml-auto cursor-pointer" onClick={() => setOutput([])}>
                            <FontAwesomeIcon icon={faTimes} />
                        </span>
                    </h2>
                    <pre className="px-4 py-2 max-h-96 overflow-auto">
                        {output.map((e, i) => (
                            <p key={i} className={`${e[0] ? "text-red-600" : "text-white"}`}>
                                {e[1]}
                            </p>
                        ))}
                    </pre>
                </div>
            )}
        </div>
    );
}
