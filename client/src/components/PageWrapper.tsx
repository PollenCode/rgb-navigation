import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faBook, faDotCircle, faFire, faHome, faKey, faQuestion, faSignOutAlt, faUsers } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useContext } from "react";
import { NavLink, Redirect } from "react-router-dom";
import { faGitlab } from "@fortawesome/free-brands-svg-icons";
import { AuthContext } from "../AuthContext";
import { Button } from "./Button";

function SidebarButton(props: { name: string; to: string; icon?: IconDefinition }) {
    return (
        <li>
            <NavLink
                activeClassName="bg-red-100 transition text-red-600"
                exact
                to={props.to}
                className="py-2 px-4 block hover:bg-gray-50 transition text-gray-700">
                {props.icon && <FontAwesomeIcon className="mr-1.5 opacity-60" icon={props.icon} />}
                {props.name}
            </NavLink>
        </li>
    );
}
// style={{ transform: `translateX(${"-100vw"})` }}
export function PageWrapper(props: { children?: React.ReactNode }) {
    const client = useContext(AuthContext);
    return (
        <div className="flex flex-col h-full overflow-hidden">
            <nav className="flex items-center h-12 flex-shrink-0 border-b shadow-sm z-10">
                <img src="/icon.png" className="w-5 h-5 ml-3 " alt="" style={{ imageRendering: "pixelated" }} />
                <span className="ml-2 font-bold text-lg text-gray-700">Navigation</span>
                <div className="ml-auto text-right text-sm leading-4 px-3"></div>
            </nav>
            <div className="flex flex-grow overflow-hidden">
                <div className="bg-white w-48 border-r flex-shrink-0 hidden lg:flex lg:flex-col">
                    <ul className="w-full">
                        <SidebarButton icon={faFire} name="Effects" to="/admin/effects" />
                        <SidebarButton icon={faDotCircle} name="Realtime" to="/realtime" />
                        <SidebarButton icon={faKey} name="API Keys" to="/admin/token" />
                        <SidebarButton icon={faUsers} name="Gebruikers" to="/admin/users" />
                        <SidebarButton name="D-gang" to="/admin/dgang" />
                        <SidebarButton name="LedController" to="/admin/ledcontrol" />
                    </ul>
                    <div className="mt-auto p-2 bg-gray-100">
                        <p>
                            <a target="_blank" className="text-blue-600 hover:underline" href="https://pollencode.github.io/rgb-navigation/">
                                <FontAwesomeIcon icon={faBook} /> Documentatie
                            </a>
                        </p>
                        <p>
                            <a target="_blank" className="text-blue-600 hover:underline" href="https://git.ikdoeict.be/stijn.rogiest/rgb-navigation">
                                <FontAwesomeIcon icon={faGitlab} /> GitLab
                            </a>
                        </p>
                        {/* <p>Welkom, {client.user?.name}</p> */}
                        {/* <Button danger style={{ display: "block" }} icon={faSignOutAlt}>
                            Uitloggen
                        </Button> */}
                        <button className="text-blue-600 hover:underline" onClick={() => client.setAccessToken(undefined)}>
                            <FontAwesomeIcon icon={faSignOutAlt} /> Uitloggen
                        </button>
                    </div>
                </div>
                <div className="flex-grow overflow-auto w-full">{props.children}</div>
            </div>
        </div>
    );
}
