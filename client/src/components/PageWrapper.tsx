import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faDotCircle, faFire, faHome, faUsers } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../AuthContext";

function SidebarButton(props: { name: string; to: string; icon?: IconDefinition }) {
    return (
        <li>
            <NavLink
                activeClassName="bg-blue-100 transition text-blue-600"
                exact
                to={props.to}
                className="py-2 px-4 block hover:bg-gray-50 transition text-gray-700">
                {props.icon && <FontAwesomeIcon className="mr-1.5 opacity-60" icon={props.icon} />}
                {props.name}
            </NavLink>
        </li>
    );
}

export function PageWrapper(props: { children?: React.ReactNode }) {
    const client = useContext(AuthContext);
    return (
        <div className="flex flex-col h-full overflow-hidden">
            <nav className="border-b  flex items-center h-12 flex-shrink-0">
                <img src="/icon.png" className="w-5 h-5 ml-3 " alt="" style={{ imageRendering: "pixelated" }} />
                <span className="ml-2 font-bold text-lg text-gray-700">Navigation</span>
                <div className="ml-auto text-right text-sm leading-4 px-3">
                    <p className="font-semibold">Ingelogd als {client.user?.name}</p>
                    <button className="text-blue-600" onClick={() => client.setAccessToken(undefined)}>
                        Uitloggen
                    </button>
                </div>
            </nav>
            <div className="flex flex-grow overflow-hidden">
                <div className="w-48 border-r flex-shrink-0">
                    <ul className="w-full">
                        <SidebarButton icon={faHome} name="Home" to="/admin" />
                        <SidebarButton icon={faFire} name="Effects" to="/admin/effects" />
                        <SidebarButton name="D-gang" to="/admin/dgang" />
                        <SidebarButton icon={faUsers} name="Gebruikers" to="/admin/users" />
                        <SidebarButton icon={faDotCircle} name="Realtime" to="/admin/overview/dgang" />
                        <SidebarButton name="LedController" to="/admin/ledcontrol" />
                    </ul>
                </div>
                <div className="flex-grow overflow-auto">{props.children}</div>
            </div>
        </div>
    );
}
