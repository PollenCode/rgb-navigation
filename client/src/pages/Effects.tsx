import React, { useContext, useEffect, useRef, useState } from "react";
import { Prompt, RouteComponentProps, useHistory } from "react-router";
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { Button } from "../components/Button";
import Editor, { useMonaco, Monaco } from "@monaco-editor/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCheck,
    faCheckCircle,
    faChevronLeft,
    faEye,
    faMagic,
    faPen,
    faSave,
    faTimes,
    faTrash,
    faUpload,
    IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { LedControllerMessage } from "rgb-navigation-api";
import { List, ListItem } from "../components/List";
import monaco from "monaco-editor";

interface Effect {
    name: string;
    code: string;
    id: number;
    active?: boolean;
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

function EffectListItem(props: { effect: Effect; onClick?: () => void }) {
    const client = useContext(AuthContext);
    const history = useHistory();
    const readOnly = !client.user || !props.effect.author || client.user.id !== props.effect.author.id;
    return (
        <ListItem active={props.effect.active} onClick={props.onClick}>
            {props.effect.active && (
                <span className="text-blue-600 text-lg overflow-hidden pl-3.5">
                    <FontAwesomeIcon className="pop-in" icon={faCheckCircle} />
                </span>
            )}
            <span className={`font-semibold py-2 pl-3.5 ${props.effect.active ? "text-blue-600" : ""}`}>{props.effect.name}</span>
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
        </ListItem>
    );
}

const DEFAULT_CODE = `

// This code will run for every led on the strip
// index contains which led is currently 
// timer contains the time in millis

// Example effect
// Flashing red
r = timer % 255
g = 0
b = 0

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
                <List>
                    {effects.map((e) => (
                        <EffectListItem
                            key={e.id}
                            effect={e}
                            onClick={async () => {
                                await client.buildEffect(e.id, true);
                                setEffects((effects) => effects!.map((t) => ({ ...t, active: t.id === e.id })));
                            }}
                        />
                    ))}
                </List>
            </div>
        </div>
    );
}

export function EffectEdit(props: RouteComponentProps<{ id: string }>) {
    const client = useContext(AuthContext);
    const [effect, setEffect] = useState<Effect>();
    const [code, setCode] = useState<string>();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ percent: number; status: string }>({ percent: 0, status: "" });
    const [showOutput, setShowOutput] = useState(false);
    const history = useHistory();
    const outputRef = useRef<HTMLPreElement>(null);
    const readOnly = !effect || !effect.author || !client.user || client.user.id !== effect.author.id;
    const monaco = useMonaco();

    function clearOutput() {
        if (outputRef.current) {
            outputRef.current.innerText = "";
        }
    }

    function appendOutput(data: string, error = false) {
        if (outputRef.current) {
            let el = document.createElement("span");
            if (error) el.style.color = "red";
            el.innerText = data;
            outputRef.current.appendChild(el);
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }

    useEffect(() => {
        if (!monaco) return;
        if (!monaco.languages.getLanguages().some((e) => e.id === "rgb-lang")) {
            registerLanguage(monaco);
        }
    }, [monaco]);

    useEffect(() => {
        client.getEffect(parseInt(props.match.params.id)).then(setEffect);

        function onArduinoData(data: LedControllerMessage) {
            appendOutput(data.data, data.type === "error");
        }

        client.socket.on("arduinoOutput", onArduinoData);
        client.socket.emit("arduinoSubscribe", true);

        return () => {
            client.socket.off("arduinoOutput", onArduinoData);
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
        setLoading(true);
        setShowOutput(true);
        clearOutput();
        if (effect!.author!.id === client.user!.id) await save();
        let res = await client.buildEffect(effect!.id, true);
        if (res.status === "error") {
            appendOutput(res.error + "\n", true);
        } else {
            appendOutput("compiling ok\n");
        }
        await new Promise((res) => setTimeout(res, 2000));
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
            <div className="text-white flex items-center p-1" style={{ backgroundColor: "#1e1e1e" }}>
                <a href="https://pollencode.github.io/rgb-navigation/index" target="_blank" className="ml-auto hover:underline px-2">
                    Documentatie
                </a>
                <button className="hover:underline px-2" onClick={() => setShowOutput(!showOutput)}>
                    {showOutput ? "Sluit" : "Toon"} output
                </button>
            </div>
            <div className="relative" style={{ maxHeight: status.percent >= 1 || status.percent <= 0 ? "0" : "100px", transition: "2000ms" }}>
                <div
                    style={{ width: status.percent * 100 + "%", transition: status.percent <= 0 ? "0ms" : "1000ms" }}
                    className="bg-blue-500 h-full text-sm px-2 pt-0.5 text-white font-semibold">
                    {status.status}
                </div>
            </div>
            <div className="h-full relative overflow-hidden fade-in">
                <Editor
                    options={{
                        minimap: {
                            enabled: false,
                        },
                        autoClosingBrackets: "always",
                    }}
                    defaultLanguage="rgb-lang"
                    theme="vs-dark"
                    value={code}
                    onChange={(ev) => setCode(ev)}
                />
            </div>
            {showOutput && (
                <div className="absolute bottom-0 right-0 w-full border-t bg-black bg-opacity-10 text-white" style={{ backdropFilter: "blur(8px)" }}>
                    <h2 className="font-bold px-4 py-2 flex">
                        Output
                        <span title="Clear output" className="ml-auto cursor-pointer mr-5" onClick={() => clearOutput()}>
                            <FontAwesomeIcon icon={faTrash} />
                        </span>
                        <span title="Hide output" className="cursor-pointer" onClick={() => setShowOutput(false)}>
                            <FontAwesomeIcon icon={faTimes} />
                        </span>
                    </h2>
                    <pre className="px-4 py-2 max-h-80 h-80 overflow-auto" ref={outputRef}></pre>
                </div>
            )}
        </div>
    );
}

function getInfoForFunction(functionName: string): monaco.languages.SignatureInformation[] {
    switch (functionName) {
        case "sin":
            return [
                {
                    label: "int sin(int value)",
                    documentation: "Calculates sine of a value",
                    parameters: [{ label: "int value, 0 is mapped to 0pi and 256 is mapped to 2pi" }],
                },
            ];
        case "cos":
            return [
                {
                    label: "int cos(int value)",
                    documentation: "Calculates cosine of a value",
                    parameters: [{ label: "int value, 0 is mapped to 0pi and 256 is mapped to 2pi" }],
                },
            ];
        case "hsv":
            return [
                {
                    label: "void hsv(byte h, byte s, byte v)",
                    documentation: "Sets the r, g and b variables using the hsv colorspace",
                    parameters: [
                        { label: "h", documentation: "The colors hue (0 -> 255)" },
                        { label: "s", documentation: "The colors saturation (0 -> 255)" },
                        { label: "v", documentation: "The brightness of the color (0 -> 255)" },
                    ],
                },
            ];
        case "map":
            return [
                {
                    label: "int map(int value, int fromLow, int fromHigh, int toLow, int toHigh)",
                    documentation:
                        "Re-maps a number from one range to another. That is, a value of fromLow would get mapped to toLow, a value of fromHigh to toHigh, values in-between to values in-between, etc.",
                    parameters: [
                        { label: "value", documentation: "The number to map." },
                        { label: "fromLow", documentation: "The lower bound of the value’s current range" },
                        { label: "fromHigh", documentation: "The upper bound of the value’s current range" },
                        { label: "toLow", documentation: "The lower bound of the value’s target range" },
                        { label: "toHigh", documentation: "The upper bound of the value’s target range" },
                    ],
                },
            ];
        case "max":
            return [
                {
                    label: "int max(int value1, int value2)",
                    documentation: "Returns the highest value of value1/value2",
                    parameters: [{ label: "value1" }, { label: "value2" }],
                },
            ];
        case "min":
            return [
                {
                    label: "int min(int value1, int value2)",
                    documentation: "Returns the lowest value of value1/value2",
                    parameters: [{ label: "value1" }, { label: "value2" }],
                },
            ];
        case "clamp":
            return [
                {
                    label: "int clamp(int value, int min, int max)",
                    documentation: "Limits value between min and max",
                    parameters: [{ label: "value" }, { label: "min" }, { label: "max" }],
                },
            ];
        case "lerp":
            return [
                {
                    label: "int lerp(int a, int b, int percentage)",
                    documentation: "Goes from a to b, percentage (0 -> 256) determines which number between a and b to return",
                    parameters: [
                        { label: "a" },
                        { label: "b" },
                        {
                            label: "percentage",
                            documentation: "(0 -> 255), when 0 returns a, when 255 returns b, otherwise a number between a and b",
                        },
                    ],
                },
            ];
        case "out":
            return [{ label: "int out(int value)", documentation: "Prints a value to the console and returns it", parameters: [{ label: "value" }] }];
        case "random":
            return [{ label: "byte random()", documentation: "Returns a random value between 0 -> 255", parameters: [] }];
        default:
            return [];
    }
}

function getFunctions(): { name: string; documentation?: string }[] {
    return [
        // Macros
        { name: "sin", documentation: "Calculates sine of a value" },
        { name: "cos", documentation: "Calculates cosine of a value" },

        // Functions
        { name: "out", documentation: "Prints a value to the console and returns it" },
        { name: "hsv", documentation: "Sets the r, g and b variables using the hsv colorspace" },
        { name: "min", documentation: "Returns the lowest value of 2 values" },
        { name: "max", documentation: "Returns the highest value of 2 values" },
        { name: "random", documentation: "Returns a random byte" },
        { name: "lerp", documentation: "Linearly interpolates between 2 values" },
        { name: "clamp", documentation: "Limit a value between min and max" },
        { name: "map", documentation: "Re-maps a number from one range to another. " },
    ];
}

function findVariables(monaco: Monaco, model: monaco.editor.ITextModel): monaco.languages.CompletionItem[] {
    let vars = Array.from(model!.findMatches("(int|float|byte)+\\s+([a-z0-9]+)\\s*(;|=)", false, true, false, null, true)).map(
        (e) =>
            ({
                kind: monaco.languages.CompletionItemKind.Variable,
                insertText: e.matches![2],
                range: undefined as any,
                label: e.matches![2],
            } as monaco.languages.CompletionItem)
    );

    const DEFAULT_VARS: { name: string; documentation?: string }[] = [
        { name: "index", documentation: "The number of the current led" },
        { name: "timer", documentation: "Time in milliseconds since the program has started" },
        { name: "r", documentation: "The red value of the current led" },
        { name: "g", documentation: "The green value of the current led" },
        { name: "b", documentation: "The blue value of the current led" },
    ];
    DEFAULT_VARS.forEach((e) =>
        vars.push({
            label: e.name,
            insertText: e.name,
            kind: monaco.languages.CompletionItemKind.Variable,
            range: undefined as any,
            documentation: e.documentation,
            sortText: "a",
        })
    );

    return vars;
}

function registerLanguage(monaco: Monaco) {
    console.log("registering language...");
    monaco.languages.register({ id: "rgb-lang" });
    monaco.languages.setMonarchTokensProvider("rgb-lang", {
        tokenizer: {
            root: [
                [/\/\/.*/, "comment"],
                [/\b(if|else|int|short|float|byte|halt)\b/, "keyword"],
                [/\b(=|==|>|<|>=|<=|\+|-|\*|%|\^)\b/, "operator"],
                [/\b(\d+)\b/, "number"],
            ],
        },
    });
    monaco.languages.registerSignatureHelpProvider("rgb-lang", {
        signatureHelpTriggerCharacters: ["(", ","],
        signatureHelpRetriggerCharacters: [","],
        provideSignatureHelp: (model, position, token) => {
            let currentLine = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });

            let functionName = "";
            let parameterIndex = 0;
            let depth = 0;
            for (let i = currentLine.length - 1; i >= 1; i--) {
                if (currentLine[i] === ",") {
                    if (depth === 0) {
                        parameterIndex++;
                    }
                } else if (currentLine[i] === ")") {
                    depth++;
                } else if (currentLine[i] === "(" && currentLine[i - 1].match(/[a-z0-9]/)) {
                    if (depth > 0) {
                        depth--;
                    } else {
                        let str: string[] = [];
                        for (let j = i - 1; j >= 0; j--) {
                            if (!currentLine[j].match(/[a-z0-9]/)) {
                                break;
                            }
                            str.unshift(currentLine[j]);
                        }
                        functionName = str.join("");
                        break;
                    }
                }
            }
            if (!functionName) return;
            console.log("functionName", functionName, parameterIndex);

            let functionInfo = getInfoForFunction(functionName);
            return {
                dispose: () => {},
                value: {
                    activeParameter: parameterIndex,
                    activeSignature: 0,
                    signatures: functionInfo,
                },
            };
        },
    });
    monaco.languages.registerCompletionItemProvider("rgb-lang", {
        resolveCompletionItem: (e) => {
            return {
                ...e,
                detail: e.documentation as string,
            };
        },
        provideCompletionItems: (model) => ({
            suggestions: [
                { kind: monaco.languages.CompletionItemKind.Class, insertText: "int", range: undefined as any, label: "int" },
                { kind: monaco.languages.CompletionItemKind.Class, insertText: "float", range: undefined as any, label: "float" },
                { kind: monaco.languages.CompletionItemKind.Class, insertText: "byte", range: undefined as any, label: "byte" },
                { kind: monaco.languages.CompletionItemKind.Keyword, insertText: "if", range: undefined as any, label: "if" },
                { kind: monaco.languages.CompletionItemKind.Keyword, insertText: "else", range: undefined as any, label: "else" },
                {
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: "halt",
                    range: undefined as any,
                    label: "halt",
                    documentation: "Exits this program",
                },
                ...findVariables(monaco, model),
                ...getFunctions().map((e) => ({
                    kind: monaco.languages.CompletionItemKind.Function,
                    insertText: e.name,
                    range: undefined as any,
                    label: e.name,
                    documentation: e.documentation,
                    sortText: "b",
                })),
            ],
        }),
    });
}
