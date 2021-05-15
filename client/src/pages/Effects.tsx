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
    faCircleNotch,
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

export interface Effect {
    name: string;
    code: string;
    id: number;
    active?: boolean;
    lastError: string | null;
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
    title?: string;
}) {
    return (
        <button
            title={props.title}
            className="bg-gray-200 rounded py-1 px-2 text-blue-600 font-semibold text-sm hover:bg-opacity-100 hover:bg-gray-300"
            style={props.style}
            onClick={(ev) => {
                ev.stopPropagation();
                props.onClick?.(ev);
            }}>
            <span className="hidden md:inline">{props.children}</span>
            {props.icon && <FontAwesomeIcon className="ml-1" icon={props.icon} />}
        </button>
    );
}

function EffectListItem(props: { effect: Effect; onClick?: () => Promise<void> }) {
    const client = useContext(AuthContext);
    const history = useHistory();
    const readOnly = !client.user || !props.effect.author || client.user.id !== props.effect.author.id;
    const [loading, setLoading] = useState(false);
    return (
        <ListItem
            error={!!props.effect.lastError}
            active={props.effect.active}
            onClick={async () => {
                setLoading(true);
                await props.onClick?.();
                setLoading(false);
            }}>
            {(props.effect.active || props.effect.lastError || loading) && (
                <span className={`${props.effect.lastError ? "text-red-600" : "text-blue-600"} text-lg overflow-hidden pl-3.5`}>
                    <FontAwesomeIcon
                        className={`${loading ? "animate-spin" : "pop-in"}`}
                        icon={loading ? faCircleNotch : props.effect.lastError ? faTimes : faCheckCircle}
                    />
                </span>
            )}
            <span className={`font-semibold py-2 pl-3.5 ${props.effect.lastError ? "text-red-600" : props.effect.active ? "text-blue-600" : ""}`}>
                {props.effect.name}
            </span>
            {props.effect.author && (
                <span className="ml-1.5 text-sm text-gray-400 py-2" title={props.effect.author.email}>
                    (door {props.effect.author.name})
                </span>
            )}
            <span className="ml-auto"></span>
            {props.effect.lastError && (
                <EffectListItemButton
                    icon={faTimes}
                    style={{ color: "red" }}
                    title={props.effect.lastError}
                    onClick={() => alert(`Compilatie fout:\n${props.effect.lastError}`)}>
                    Error
                </EffectListItemButton>
            )}
            <EffectListItemButton
                icon={readOnly ? faEye : faPen}
                style={{ margin: "0 0.4em" }}
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
// 'index' contains which led is currently 
// 'timer' contains the time in millis

// Use Ctrl+Space to see which utility functions are available

// Example effect: pulsing red
r = sin(timer / 5)
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
                                if (e.active) return;
                                let res = await client.buildEffect(e.id, true);
                                if (res.status === "ok") {
                                    setEffects((effects) =>
                                        effects!.map((t) => (t.id === e.id ? { ...t, active: true, lastError: null } : { ...t, active: false }))
                                    );
                                } else {
                                    let error = res.error;
                                    setEffects((effects) => effects!.map((t) => (t.id === e.id ? { ...t, lastError: error } : t)));
                                }
                                await new Promise((res) => setTimeout(res, 1000));
                            }}
                        />
                    ))}
                </List>
            </div>
        </div>
    );
}
