import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faBook, faDotCircle, faFire, faHome, faKey, faQuestion, faSignOutAlt, faUsers } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useContext, useEffect, useLayoutEffect } from "react";
import { NavLink, Redirect } from "react-router-dom";
import { faGitlab } from "@fortawesome/free-brands-svg-icons";
import { AuthContext } from "../AuthContext";
import { Button } from "./Button";
import { beginRenderLeds } from "../simulate";

function SidebarButton(props: { name: string; to: string; icon?: IconDefinition }) {
    return (
        <li>
            <NavLink
                activeClassName="bg-gray-600 transition"
                activeStyle={{ color: "white" }}
                exact
                to={props.to}
                className="py-2 px-4 block hover:bg-gray-600 transition text-gray-200">
                {props.icon && <FontAwesomeIcon className="mr-2 opacity-60" icon={props.icon} />}
                {props.name}
            </NavLink>
        </li>
    );
}
// style={{ transform: `translateX(${"-100vw"})` }}
export function PageWrapper(props: { children?: React.ReactNode }) {
    const client = useContext(AuthContext);

    useLayoutEffect(() => {
        beginRenderLeds(document.getElementById("leds-canvas")! as HTMLCanvasElement);
    }, []);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex flex-grow overflow-hidden">
                <div className="w-48 flex-shrink-0 hidden lg:flex lg:flex-col shadow-lg z-10 bg-gray-800 text-white">
                    <nav className="flex items-center h-10 flex-shrink-0 bg-gray-900 text-gray-700 shadow-lg z-10">
                        <img
                            src="/icon.png"
                            className="w-5 h-5 ml-2 hover:rotate-180 transition transform"
                            alt=""
                            style={{ imageRendering: "pixelated" }}
                        />
                        <span className="ml-2 mt-0.5 font-bold text-white">RGB</span>
                        <div className="ml-auto text-right text-sm leading-4 px-3"></div>
                    </nav>
                    <ul className="w-full">
                        <SidebarButton icon={faFire} name="Effects" to="/admin/effects" />
                        <SidebarButton icon={faDotCircle} name="Realtime" to="/realtime" />
                        <SidebarButton icon={faKey} name="API Keys" to="/admin/token" />
                        <SidebarButton icon={faUsers} name="Gebruikers" to="/admin/users" />
                        <SidebarButton name="D-gang" to="/admin/dgang" />
                        <SidebarButton name="LedController" to="/admin/ledcontrol" />
                    </ul>
                    <div className="mt-auto p-2.5 bg-gray-900 shadow-lg z-10">
                        <p>
                            <a target="_blank" className="text-gray-100 text-sm hover:underline" href="https://pollencode.github.io/rgb-navigation/">
                                <FontAwesomeIcon icon={faBook} /> Documentatie
                            </a>
                        </p>
                        <p>
                            <a
                                target="_blank"
                                className="text-gray-100 text-sm hover:underline"
                                href="https://git.ikdoeict.be/stijn.rogiest/rgb-navigation">
                                <FontAwesomeIcon icon={faGitlab} /> GitLab
                            </a>
                        </p>
                        {/* <p>Welkom, {client.user?.name}</p> */}
                        {/* <Button danger style={{ display: "block" }} icon={faSignOutAlt}>
                            Uitloggen
                        </Button> */}
                        <button className="text-gray-100 text-sm hover:underline" onClick={() => client.setAccessToken(undefined)}>
                            <FontAwesomeIcon icon={faSignOutAlt} /> Uitloggen
                        </button>
                    </div>
                </div>

                <div className="flex-grow overflow-auto w-full bg-gray-100">
                    <canvas height="16px" width="784px" id="leds-canvas" className="w-full max-h-4 h-4"></canvas>
                    {props.children}
                </div>
            </div>
        </div>
    );
}
