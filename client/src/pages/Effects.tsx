import React, { HTMLProps, useContext, useEffect, useMemo, useRef, useState } from "react";
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
    faStar,
    faTimes,
    faTrash,
    faUpload,
    IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { Effect, LedControllerMessage } from "rgb-navigation-api";
import { List, ListItem } from "../components/List";
import monaco from "monaco-editor";
import ms from "ms";
import { Timer } from "../components/Timer";

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

function EffectListItem(props: { effect: Effect; onActivate: () => Promise<void>; onFavorite: () => void; showAuthor: boolean }) {
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

            <div className="leading-4 py-2 pl-3.5 mt-1">
                <span className={`font-semibold py-2 ${props.effect.active ? "text-blue-600" : ""}`}>{props.effect.name}</span>

                <div className="opacity-50 lg:text-sm text-xs flex">
                    {props.effect.author && props.showAuthor && (
                        <>
                            <small className="whitespace-nowrap" title={props.effect.author.email}>
                                Door {props.effect.author.name}
                            </small>
                            <span className="mx-1">·</span>
                        </>
                    )}

                    <small className="whitespace-nowrap">
                        Aangepast <Timer date={new Date(props.effect.modifiedAt)} /> geleden
                    </small>
                </div>
            </div>

            <span className="ml-auto"></span>

            <span
                className="p-2"
                onClick={(ev) => {
                    ev.stopPropagation();
                    if (client.user!.admin) {
                        props.onFavorite();
                    } else {
                        alert(
                            "Een effect heeft een ster wanneer deze zich in de actieve effecten-cyclus bevindt. Dit kan enkel aangevinkt worden door een administrator. Enkel de beste effecten krijgen een ster!"
                        );
                    }
                }}>
                <FontAwesomeIcon
                    icon={faStar}
                    className={"text-lg " + (props.effect.favorite ? "text-yellow-400 hover:text-yellow-600" : "text-gray-200 hover:text-gray-500")}
                />
            </span>

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
                        await props.onActivate();
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
    const [carrouselActive, setCarrouselActive] = useState(false);
    const history = useHistory();

    useEffect(() => {
        function onActiveEffect({ activeEffectId, carrouselActive }: { activeEffectId: number; carrouselActive: boolean }) {
            setEffects((effects) =>
                effects!.map((t) => (t.id === activeEffectId ? { ...t, active: true, lastError: null } : { ...t, active: false }))
            );
            setCarrouselActive(carrouselActive);
        }
        client.socket.on("activeEffect", onActiveEffect);
        return () => {
            client.socket.off("activeEffect", onActiveEffect);
        };
    }, []);

    useEffect(() => {
        client.getEffects(false, props.userOnly).then(({ effects, carrouselActive }) => {
            setEffects(effects);
            setCarrouselActive(carrouselActive);
        });
    }, [props.userOnly]);

    if (!effects) {
        return null;
    }

    return (
        <div className="flex justify-center px-1 md:px-4 pt-3 md:pt-10 overflow-auto">
            <div style={{ width: "800px" }}>
                <div className="flex">
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
                    <div>{carrouselActive ? "true" : "false"}</div>
                </div>
                <List>
                    {effects.map((e) => (
                        <EffectListItem
                            showAuthor={!props.userOnly}
                            key={e.id}
                            effect={e}
                            onFavorite={async () => {
                                await client.favoriteEffect(e.id, !e.favorite);
                                setEffects((effects) => effects!.map((t) => (e.id === t.id ? { ...t, favorite: !e.favorite } : t)));
                            }}
                            onActivate={async () => {
                                if (e.active) return;
                                let res = await client.buildEffect(e.id, true);
                                if (res.status === "ok") {
                                    // setEffects((effects) =>
                                    //     effects!.map((t) => (t.id === e.id ? { ...t, active: true, lastError: null } : { ...t, active: false }))
                                    // );
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
                <div className="h-32"></div>
            </div>
        </div>
    );
}
