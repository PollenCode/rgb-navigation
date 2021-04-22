import React from "react";
import { NavLink } from "react-router-dom";

function SidebarButton(props: { name: string; to: string }) {
    return (
        <li>
            <NavLink activeClassName="bg-blue-50" exact to={props.to} className="py-2 px-3 block">
                {props.name}
            </NavLink>
        </li>
    );
}

export function PageWrapper(props: { children?: React.ReactNode }) {
    return (
        <div className="flex flex-col h-full overflow-hidden">
            <nav className="border-b px-4 py-3">
                <span className="font-bold text-lg text-gray-700">RGB</span>
            </nav>
            <div className="flex flex-grow overflow-hidden">
                <div className="w-48 border-r flex-shrink-0">
                    <ul className="w-full">
                        <SidebarButton name="Home" to="/admin" />
                        <SidebarButton name="Ledcontrol" to="/admin/ledcontrol" />
                    </ul>
                </div>
                <div className="flex-grow overflow-auto">{props.children}</div>
            </div>
        </div>
    );
}
