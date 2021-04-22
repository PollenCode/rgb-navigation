import React from "react";
import { NavLink } from "react-router-dom";

function SidebarButton(props: { name: string; to: string }) {
    return (
        <li>
            <NavLink activeClassName="bg-blue-100 transition" exact to={props.to} className="py-2 px-4 block hover:bg-gray-50 transition">
                {props.name}
            </NavLink>
        </li>
    );
}

export function PageWrapper(props: { children?: React.ReactNode }) {
    return (
        <div className="flex flex-col h-full overflow-hidden">
            <nav className="border-b  flex items-center h-12 flex-shrink-0">
                <img src="/icon.png" className="w-5 h-5 ml-3 " alt="" style={{ imageRendering: "pixelated" }} />
                <span className="ml-2 font-bold text-lg text-gray-700">Navigation</span>
            </nav>
            <div className="flex flex-grow overflow-hidden">
                <div className="w-48 border-r flex-shrink-0">
                    <ul className="w-full">
                        <SidebarButton name="Home" to="/admin" />
                        <SidebarButton name="Ledcontrol" to="/admin/ledcontrol" />
                        <SidebarButton name="D-gang" to="/admin/dgang" />
                        <SidebarButton name="Gebruikers" to="/admin/users" />
                        <SidebarButton name="Realtime" to="/admin/overview/dgang" />
                    </ul>
                </div>
                <div className="flex-grow overflow-auto">{props.children}</div>
            </div>
        </div>
    );
}
