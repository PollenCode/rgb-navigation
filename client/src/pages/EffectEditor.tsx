import React, { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
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
    faCircleNotch,
    faEye,
    faFileAlt,
    faMagic,
    faPen,
    faSave,
    faTimes,
    faTrash,
    faUpload,
    IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { Effect, IdeInfo, LedControllerMessage } from "rgb-navigation-api";
import { List, ListItem } from "../components/List";
import monaco from "monaco-editor";
import { BlockToken, ByteType, IntType, JavascriptTarget, parseProgram, Scope, SyntaxError, TypeError, VoidType } from "rgb-compiler";
import { beginRenderLeds, SimulateDataEvent } from "../simulate";

const MAX_OUTPUT_LINES = 400;

export function EffectEditor(props: RouteComponentProps<{ id: string }>) {
    const client = useContext(AuthContext);
    const [effect, setEffect] = useState<Effect>();
    const [code, setCode] = useState<string>();
    const [loading, setLoading] = useState(false);
    const [ideInfo, setIdeInfo] = useState<IdeInfo>();
    // const [status, setStatus] = useState<{ percent: number; status: string }>({ percent: 0, status: "" });
    const [showOutput, setShowOutput] = useState(false);
    const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor>();
    const readOnly = !effect || !effect.author || !client.user || client.user.id !== effect.author.id;
    const history = useHistory();
    const outputRef = useRef<HTMLPreElement>(null);
    const simulateDataRef = useRef<HTMLPreElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
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

            if (outputRef.current.scrollHeight - outputRef.current.clientHeight - outputRef.current.scrollTop < 125) {
                outputRef.current.scrollTop = outputRef.current.scrollHeight;
            }

            if (outputRef.current.childElementCount > MAX_OUTPUT_LINES) {
                outputRef.current.firstChild!.remove();
            }
        }
    }

    useEffect(() => {
        if (!monaco || !ideInfo) return;
        if (!monaco.languages.getLanguages().some((e) => e.id === "rgb-lang")) {
            registerLanguage(monaco, ideInfo);
        }
    }, [monaco, ideInfo]);

    useEffect(() => {
        client.getEffect(parseInt(props.match.params.id)).then(setEffect);
        client.ideInfo().then(setIdeInfo);

        function onArduinoData(data: LedControllerMessage) {
            appendOutput(data.data, data.type === "error");
        }

        function onSimulateData(ev: SimulateDataEvent) {
            if (!simulateDataRef.current) return;
            simulateDataRef.current.innerText = JSON.stringify(ev.memory, null, 2);
        }

        window.addEventListener("simulate-data" as any, onSimulateData);
        client.socket.on("arduinoOutput", onArduinoData);
        client.socket.emit("arduinoSubscribe", true);

        for (let i = 0; i < 100; i++) {
            appendOutput("starting...\n");
        }

        return () => {
            client.socket.off("arduinoOutput", onArduinoData);
            client.socket.emit("arduinoSubscribe", false);
            window.removeEventListener("simulate-data" as any, onSimulateData);
        };
    }, []);

    useEffect(() => {
        if (effect) setCode(effect.code);
    }, [effect]);

    useEffect(() => {
        if (editor && monaco && code) {
            let compiled = tryCompile(monaco, code, editor.getModel()!);
            if (compiled) {
                // Place compiled javascript code on window object
                console.log(compiled);
                (window as any).runLeds = eval(compiled); // Yikes, transition to iframe sandboxing?
            }
        }

        let renderTask = canvasRef.current ? beginRenderLeds(canvasRef.current!) : { task: 0 };
        return () => {
            cancelAnimationFrame(renderTask.task);
        };
    }, [code, monaco, editor]);

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
        if (!client.user!.admin) {
            return alert(
                "Je hebt geen rechten om te uploaden, spreek een docent aan om je programma te uploaden naar de ledstrip. \n\nAls je een docent bent, dan kan je een administatoraccount aanvragen bij Tim Vermeulen (tim.vermeulen@odisee.be) of Stijn Rogiest (stijn.rogiest@student.odisee.be)"
            );
        }

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

        await new Promise((res) => setTimeout(res, 500));
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
        <div className="flex-grow overflow-hidden relative flex flex-col">
            <Prompt when={effect.code !== code && !readOnly} message="Ben je zeker dat je wilt weg gaan? Je hebt onopgeslagen aanpassingen." />
            <div className="py-2 px-4 border-b font-semibold text-gray-600 flex items-center">
                <button onClick={() => history.goBack()} className="text-blue-600 pr-4">
                    <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                <input
                    defaultValue={effect.name}
                    readOnly={readOnly}
                    className="font-semibold min-w-0 flex-grow bg-white appearance-none"
                    onBlur={(ev) => updateName(ev.target.value)}
                />
                {readOnly && effect.author && (
                    <span className=" text-gray-400 mr-4" title={effect.author.email}>
                        (Door {effect.author.name}, aleen lezen)
                    </span>
                )}
                {effect && (
                    <Button
                        style={{ marginRight: "0.3em" }}
                        loading={loading}
                        icon={faUpload}
                        disabled={loading || !client.user?.admin}
                        onClick={build}>
                        Upload
                    </Button>
                )}
                {effect && !readOnly && (
                    <Button
                        allowSmall
                        style={{ marginRight: "0.3em" }}
                        loading={loading}
                        icon={faSave}
                        disabled={loading || effect.code === code}
                        onClick={save}>
                        Opslaan
                    </Button>
                )}
                {effect && (
                    <Button allowSmall style={{ marginRight: "0.3em" }} loading={loading} icon={faFileAlt} onClick={() => setShowOutput(!showOutput)}>
                        {showOutput ? "Sluit" : "Toon"} output
                    </Button>
                )}
                {effect && !readOnly && (
                    <Button allowSmall styleType="danger" icon={faTrash} disabled={loading} onClick={deleteEffect}>
                        Verwijder
                    </Button>
                )}
            </div>
            <canvas ref={canvasRef} height="16px" width="784px" id="leds-canvas" className="w-full max-h-4 h-4"></canvas>

            {/* <div className="relative" style={{ maxHeight: status.percent >= 1 || status.percent <= 0 ? "0" : "100px", transition: "2000ms" }}>
                <div
                    style={{ width: status.percent * 100 + "%", transition: status.percent <= 0 ? "0ms" : "1000ms" }}
                    className="bg-blue-500 h-full text-sm px-2 pt-0.5 text-white font-semibold">
                    {status.status}
                </div>
            </div> */}
            <div className="flex-grow flex-shrink relative w-full max-w-full">
                <Editor
                    onMount={(editor) => {
                        setEditor(editor);
                    }}
                    options={{
                        minimap: {
                            enabled: false,
                        },
                        autoClosingBrackets: "always",
                        matchBrackets: "always",
                    }}
                    defaultLanguage="rgb-lang"
                    theme="rgb-lang-theme"
                    value={code}
                    onChange={(ev) => setCode(ev)}
                />
            </div>
            {showOutput && (
                <div
                    className="absolute left-0 bottom-0 w-full text-white"
                    style={{ backdropFilter: "blur(8px)", background: "#111", borderTop: "1px solid #222" }}>
                    <div className="relative">
                        <span
                            title="Clear output"
                            className="cursor-pointer absolute px-3 py-2 top-0 right-8 hover:scale-150 transform transition"
                            onClick={() => clearOutput()}>
                            <FontAwesomeIcon icon={faTrash} />
                        </span>
                        <span
                            title="Hide output"
                            className="cursor-pointer absolute px-3 py-2 top-0 right-1 hover:scale-150 transform transition"
                            onClick={() => setShowOutput(false)}>
                            <FontAwesomeIcon icon={faTimes} />
                        </span>
                        <div className="flex overflow-hidden">
                            <div className=" flex-grow overflow-hidden">
                                <h2 className="px-4 py-2 font-bold mb-1">Output</h2>
                                <pre
                                    className="px-4 py-2 overflow-auto max-h-80 h-80"
                                    style={{ borderRight: "1px solid #222" }}
                                    ref={outputRef}></pre>
                            </div>
                            <div className=" flex-shrink-0 w-72">
                                <h2 className="px-4 py-2 font-bold">Memory</h2>
                                <pre className="px-4 py-2 overflow-hidden" ref={simulateDataRef}></pre>
                                <small className="px-4 py-2 mb-t block opacity-40">(waardes van de laatste led)</small>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function tryCompile(monaco: Monaco, code: string, model: monaco.editor.ITextModel) {
    let scope = new Scope();
    scope.defineVar("timer", { type: new IntType(), volatile: true, readonly: true });
    scope.defineVar("index", { type: new IntType(), volatile: true, readonly: true });
    scope.defineVar("LED_COUNT", { type: new IntType(), readonly: true });
    scope.setVarKnownValue("LED_COUNT", 784);
    scope.defineVar("r", { type: new ByteType(), volatile: true });
    scope.defineVar("g", { type: new ByteType(), volatile: true });
    scope.defineVar("b", { type: new ByteType(), volatile: true });
    scope.defineFunc("sin", { returnType: new IntType(), parameterCount: 1 });
    scope.defineFunc("cos", { returnType: new IntType(), parameterCount: 1 });
    scope.defineFunc("abs", { returnType: new IntType(), parameterCount: 1 });
    scope.defineFunc("random", { returnType: new ByteType(), parameterCount: 0 });
    scope.defineFunc("min", { returnType: new IntType(), parameterCount: 2 });
    scope.defineFunc("max", { returnType: new IntType(), parameterCount: 2 });
    scope.defineFunc("map", { returnType: new IntType(), parameterCount: 5 });
    scope.defineFunc("lerp", { returnType: new IntType(), parameterCount: 3 });
    scope.defineFunc("clamp", { returnType: new IntType(), parameterCount: 3 });
    scope.defineFunc("hsv", { returnType: new VoidType(), parameterCount: 3 });

    let errors = [] as monaco.editor.IMarkerData[];
    let program: BlockToken;
    try {
        program = parseProgram(code);
        program.setTypes(scope);
        let target = new JavascriptTarget();
        target.compile(program);
        return target.code;
    } catch (exx) {
        console.log(String(exx));
        if (exx.name === "SyntaxError") {
            let ex = exx as SyntaxError;
            let [startLine, startColumn] = ex.lexer.lineColumn(ex.startPosition);
            let [endLine, endColumn] = ex.endPosition ? ex.lexer.lineColumn(ex.endPosition) : [startLine, 1000];
            errors = [
                {
                    severity: monaco.MarkerSeverity.Error,
                    message: ex.message,
                    startLineNumber: startLine,
                    startColumn: startColumn,
                    endColumn: endColumn,
                    endLineNumber: endLine,
                },
            ];
        } else if (exx.name === "TypeError") {
            let ex = exx as TypeError;
            let [startLine, startColumn] = ex.token.context.lineColumn(ex.token.startPosition);
            let [endLine, endColumn] = ex.token.context.lineColumn(ex.token.endPosition);
            errors = [
                {
                    severity: monaco.MarkerSeverity.Error,
                    message: ex.message,
                    startLineNumber: startLine,
                    startColumn: startColumn,
                    endColumn: endColumn,
                    endLineNumber: endLine,
                },
            ];
        } else {
            console.error(exx);
            errors = [];
        }
    } finally {
        monaco.editor.setModelMarkers(model, "rgb-lang", errors);
    }
}

function findVariables(monaco: Monaco, ideInfo: IdeInfo, model: monaco.editor.ITextModel): monaco.languages.CompletionItem[] {
    let vars = Array.from(model!.findMatches("(int|float|byte)+\\s+([a-z0-9]+)\\s*(;|=)", false, true, false, null, true)).map(
        (e) =>
            ({
                kind: monaco.languages.CompletionItemKind.Variable,
                insertText: e.matches![2],
                range: undefined as any,
                label: e.matches![2],
            } as monaco.languages.CompletionItem)
    );

    ideInfo.variables.forEach((e) =>
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

function registerLanguage(monaco: Monaco, ideInfo: IdeInfo) {
    console.log("registering language...");
    monaco.languages.register({ id: "rgb-lang" });
    monaco.languages.setMonarchTokensProvider("rgb-lang", {
        tokenizer: {
            root: [
                [/\/\/.*/, "comment"],
                [/\b(if|else|int|byte|halt)\b/, "keyword"],
                [/(=|==|>|<|>=|\|\||<=|\+|\/|-|\*|%|\^|:|\?)/, "operator"],
                [/\b(\d+)\b/, "number"],
            ],
        },
    });
    monaco.editor.defineTheme("rgb-lang-theme", {
        base: "vs-dark", // Can also be vs-dark or hc-black
        inherit: true,
        colors: {},
        rules: [
            { token: "operator", foreground: "bb7777" },
            { token: "function", foreground: "11ffff" },
        ],
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
            // console.log("functionName", functionName, parameterIndex);

            let functionInfo = ideInfo.functions.find((e) => e.name === functionName);
            return {
                dispose: () => {},
                value: {
                    activeParameter: parameterIndex,
                    activeSignature: 0,
                    signatures: functionInfo
                        ? [
                              {
                                  label: functionInfo.signature,
                                  documentation: functionInfo.documentation,
                                  parameters: functionInfo.parameters,
                              },
                          ]
                        : [],
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
                // { kind: monaco.languages.CompletionItemKind.Class, insertText: "float", range: undefined as any, label: "float" },
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
                ...findVariables(monaco, ideInfo, model),
                ...ideInfo.functions.map((e) => ({
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
