import React, { useContext, useEffect, useState } from "react";
import { Prompt, RouteComponentProps, useHistory } from "react-router";
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { Button } from "../components/Button";
import Editor, { DiffEditor, useMonaco, loader } from "@monaco-editor/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faEye, faMagic, faPen, faSave, faTimes, faTrash, faUpload, IconDefinition } from "@fortawesome/free-solid-svg-icons";
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

function EffectListItemButton(props: {
    icon?: IconDefinition;
    children?: React.ReactNode;
    style?: React.CSSProperties;
    onClick?: (ev: React.MouseEvent) => void;
}) {
    return (
        <button
            className="bg-gray-100 rounded py-1 px-2 text-blue-600 font-semibold text-sm hover:bg-opacity-100"
            style={props.style}
            onClick={props.onClick}>
            <span className="hidden md:inline">{props.children}</span>
            {props.icon && <FontAwesomeIcon className="ml-1" icon={props.icon} />}
        </button>
    );
}

function EffectListItem(props: { effect: Effect }) {
    const client = useContext(AuthContext);
    const history = useHistory();
    const readOnly = !client.user || !props.effect.author || client.user.id !== props.effect.author.id;
    return (
        <li
            className="border-b last:border-0 text-gray-700 hover:bg-gray-50 transition cursor-pointer flex items-center"
            onClick={() => client.sendIdleEffect(props.effect.id)}>
            <span className="font-semibold py-2 pl-4">{props.effect.name}</span>
            {props.effect.author && (
                <span className="ml-1.5 text-sm text-gray-400 py-2" title={props.effect.author.email}>
                    (door {props.effect.author.name})
                </span>
            )}
            <EffectListItemButton
                icon={readOnly ? faEye : faPen}
                style={{ marginLeft: "auto", marginRight: "0.4em" }}
                onClick={(ev) => {
                    ev.stopPropagation();
                    history.push(`/admin/effects/${props.effect.id}`);
                }}>
                {readOnly ? "Bekijken" : "Aanpassen"}
            </EffectListItemButton>
        </li>
    );
}

const DEFAULT_CODE = `

void setup() {
    // Do your setup logic here, do not remove this function if you don't need it
}

void loop() {

    // Example effect: set all leds to white
    for (int i = 0; i < LED_COUNT; i++)
    {
        leds[i] = CRGB(255, 255, 255);
    }

}

`;

export function Effects() {
    const client = useContext(AuthContext);
    const [effects, setEffects] = useState<Effect[] | undefined>();
    const history = useHistory();

    useEffect(() => {
        client.getEffects().then(setEffects);
    }, []);

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
                        history.push(`/admin/effects/${newEffect.id}`);
                    }}>
                    Nieuw effect maken
                </Button>
                <ul className="mt-4 border-collapse border rounded overflow-hidden">
                    {effects.map((e) => (
                        <EffectListItem key={e.id} effect={e} />
                    ))}
                </ul>
            </div>
        </div>
    );
}

export function EffectEdit(props: RouteComponentProps<{ id: string }>) {
    const client = useContext(AuthContext);
    const [effect, setEffect] = useState<Effect>();
    const [code, setCode] = useState<string>();
    const [output, setOutput] = useState<[boolean, string][]>([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ percent: number; status: string }>({ percent: 0, status: "" });
    const history = useHistory();
    const readOnly = !effect || !effect.author || !client.user || client.user.id !== effect.author.id;

    useEffect(() => {
        client.getEffect(parseInt(props.match.params.id)).then(setEffect);

        function onArduinoBuild(data: ArduinoBuildMessage) {
            if (data.type === "stderr") {
                setOutput((output) => [...output, [true, data.data]]);
            } else if (data.type === "stdout") {
                setOutput((output) => [...output, [false, data.data]]);
            } else if (data.type === "status") {
                setStatus(data);
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
        setStatus({ percent: 0, status: "Uploaden" });
        await save();
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

    async function deleteEffect() {
        if (window.confirm(`Ben je zeker dat je effect '${effect!.name}' wilt verwijderen?`)) {
            setLoading(true);
            await client.deleteEffect(effect!.id);
            history.goBack();
        }
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
                {readOnly && effect.author && (
                    <span className=" text-gray-400 mr-4" title={effect.author.email}>
                        (Door {effect.author.name}, aleen lezen)
                    </span>
                )}
                {effect && (
                    <Button style={{ marginRight: "0.3em" }} loading={loading} icon={faMagic} disabled={loading} onClick={activate}>
                        Activeer
                    </Button>
                )}
                {effect && !readOnly && (
                    <Button style={{ marginRight: "0.3em" }} loading={loading} icon={faUpload} disabled={loading} onClick={build}>
                        Upload
                    </Button>
                )}
                {effect && !readOnly && (
                    <Button
                        style={{ marginRight: "0.3em" }}
                        loading={loading}
                        icon={faSave}
                        disabled={loading || effect.code === code}
                        onClick={save}>
                        Save
                    </Button>
                )}
                {effect && !readOnly && (
                    <Button danger loading={loading} icon={faTrash} disabled={loading} onClick={deleteEffect}>
                        Verwijder
                    </Button>
                )}
            </div>
            <div className="relative" style={{ maxHeight: status.percent >= 1 || status.percent <= 0 ? "0" : "100px", transition: "2000ms" }}>
                <div
                    style={{ width: status.percent * 100 + "%", transition: status.percent <= 0 ? "0ms" : "1000ms" }}
                    className="bg-blue-500 h-full text-sm px-2 pt-0.5 text-white font-semibold">
                    {status.status}
                </div>
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
                    <pre
                        className="px-4 py-2 max-h-96 overflow-auto"
                        ref={(pre) => {
                            // Scroll to bottom automatically
                            if (pre) pre.scrollTop = pre.scrollHeight;
                        }}>
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
