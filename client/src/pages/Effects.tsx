import React, { HTMLProps, useContext, useEffect, useRef, useState } from "react";
import { Prompt, RouteComponentProps, useHistory } from "react-router";
import { Link, NavLink, NavLinkProps } from "react-router-dom";
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
    faPlus,
    faSave,
    faTimes,
    faTrash,
    faUpload,
    IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { Effect, LedControllerMessage } from "rgb-navigation-api";
import { List, ListItem } from "../components/List";
import monaco from "monaco-editor";

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
            {props.icon && <FontAwesomeIcon className="text-lg md:text-base md:ml-1" icon={props.icon} />}
        </button>
    );
}

function EffectListItem(props: { effect: Effect; onActivate?: () => Promise<void>; showAuthor: boolean }) {
    const client = useContext(AuthContext);
    const history = useHistory();
    const readOnly = !client.user || !props.effect.author || (client.user.id !== props.effect.author.id && !client.user.admin);
    const [loading, setLoading] = useState(false);
    return (
        <ListItem active={props.effect.active} onClick={() => history.push(`/effects/${props.effect.id}`)}>
            {(props.effect.active || loading) && (
                <span className={`text-blue-600 text-lg overflow-hidden pl-3.5`}>
                    <FontAwesomeIcon className={`${loading ? "animate-spin" : "pop-in"}`} icon={loading ? faCircleNotch : faCheckCircle} />
                </span>
            )}
            <span className={`font-semibold py-2 pl-3.5 ${props.effect.active ? "text-blue-600" : ""}`}>{props.effect.name}</span>
            {props.effect.author && props.showAuthor && (
                <span className="ml-1.5 text-sm text-gray-400 py-2" title={props.effect.author.email}>
                    (door {props.effect.author.name})
                </span>
            )}
            <span className="ml-auto"></span>

            <EffectListItemButton
                onClick={() => history.push(`/effects/${props.effect.id}`)}
                icon={readOnly ? faEye : faPen}
                style={{ margin: "0 0.4em" }}>
                {readOnly ? "Bekijken" : "Aanpassen"}
            </EffectListItemButton>

            {client.user!.admin && (
                <EffectListItemButton
                    icon={faMagic}
                    style={{ margin: "0 0.4em" }}
                    onClick={async (ev) => {
                        ev.stopPropagation();
                        setLoading(true);
                        await props.onActivate?.();
                        setLoading(false);
                    }}>
                    Activeren
                </EffectListItemButton>
            )}
        </ListItem>
    );
}

const DEFAULT_CODE = `
// This code will run for every led on the strip 
// 'index' contains which led the program is executing for
// 'timer' contains the time in millis since the program has started

// Use Ctrl+Space to see which utility functions are available
// More examples and documentation are available at https://pollencode.github.io/rgb-navigation/

// Example effect: pulsing red with green gradient
r = sin(timer / 5)
g = index / 4
b = 0

`;

export function Effects(props: { userOnly?: boolean }) {
    const client = useContext(AuthContext);
    const [effects, setEffects] = useState<Effect[] | undefined>();
    const history = useHistory();

    useEffect(() => {
        client.getEffects(false, props.userOnly).then(setEffects);
    }, [props.userOnly]);

    if (!effects) {
        return null;
    }

    return (
        <div className="flex justify-center px-1 md:px-4 pt-3 md:pt-10">
            <div style={{ width: "800px" }}>
                <Button
                    icon={faPlus}
                    onClick={async () => {
                        let name = prompt("Geef je nieuwe effect een naam");
                        if (!name) return;
                        let newEffect = await client.createEffect({ code: DEFAULT_CODE, name: name });
                        if (newEffect.status === "ok") {
                            setEffects([...effects, newEffect.effect]);
                            history.push(`/effects/${newEffect.effect.id}`);
                        } else {
                            alert(`Kon geen nieuw effect aanmaken:\n${newEffect.error}`);
                        }
                    }}>
                    Nieuw effect maken
                </Button>
                <List>
                    {effects.map((e) => (
                        <EffectListItem
                            showAuthor={!props.userOnly}
                            key={e.id}
                            effect={e}
                            onActivate={async () => {
                                console.log("activate");
                                if (e.active) return;
                                console.log("activate2");
                                let res = await client.buildEffect(e.id, true);
                                if (res.status === "ok") {
                                    setEffects((effects) =>
                                        effects!.map((t) => (t.id === e.id ? { ...t, active: true, lastError: null } : { ...t, active: false }))
                                    );
                                    await new Promise((res) => setTimeout(res, 500));
                                } else {
                                    alert("Kon niet uploaden: " + res.error);
                                }
                            }}
                        />
                    ))}
                    {effects.length === 0 && (
                        <p className="text-gray-500 px-4 py-3">{props.userOnly ? "Je hebt nog geen effecten." : "Er zijn nog geen effecten"}</p>
                    )}
                </List>
            </div>
        </div>
    );
}
