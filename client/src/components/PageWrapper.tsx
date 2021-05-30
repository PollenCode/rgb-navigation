import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faBars, faBook, faDotCircle, faFire, faHome, faKey, faMagic, faQuestion, faSignOutAlt, faUsers } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, Redirect, useHistory } from "react-router-dom";
import { faGitlab } from "@fortawesome/free-brands-svg-icons";
import { AuthContext } from "../AuthContext";
import { version, author } from "../../package.json";
import { LocationDescriptor } from "history";

function NavButton(props: { name: string; to: LocationDescriptor; icon?: IconDefinition; target?: string }) {
    return (
        <li className="text-gray-600">
            <NavLink
                target={props.target}
                activeClassName="pl-4 bg-gray-100 border-l-8 border-blue-500"
                exact
                to={props.to}
                className="py-2 pl-3 block hover:text-black hover:bg-gray-200 transition-all whitespace-nowrap">
                {props.icon && <FontAwesomeIcon className="mr-2 opacity-50 scale-110 transform" icon={props.icon} />}
                {props.name}
            </NavLink>
        </li>
    );
}

export function PageWrapper(props: { children?: React.ReactNode }) {
    const client = useContext(AuthContext);
    const [showMenu, setShowMenu] = useState<boolean>(false);
    const history = useHistory();
    const iconRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        return history.listen((e) => {
            setShowMenu(false);
            if (iconRef.current) {
                // Retrigger icon animation
                iconRef.current.style.animation = "none";
                setTimeout(() => {
                    if (iconRef.current) iconRef.current.style.animation = "";
                }, 10);
            }
        });
    }, []);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex flex-grow overflow-hidden md:flex-row flex-col">
                <nav className="border-r z-10">
                    <div className="flex items-center h-12 flex-shrink-0 bg-white text-gray-800 border-b ">
                        <img ref={iconRef} src="/icon64.png" className="w-6 h-6 ml-2.5 icon-animation" alt="" />
                        <span className="ml-2.5 mt-0.5 font-extrabold text-lg" onClick={() => history.push("/")}>
                            DGANG
                        </span>
                        <span className="ml-auto text-4xl opacity-60 px-2.5 pt-1 md:hidden" onClick={(ev) => setShowMenu(!showMenu)}>
                            <FontAwesomeIcon icon={faBars} />
                        </span>
                    </div>
                    <ul
                        className="transition-all duration-300 overflow-hidden w-full md:w-44"
                        style={{ maxHeight: window.innerWidth > 600 || showMenu ? "100vh" : "0" }}>
                        <NavButton icon={faMagic} name="Mijn effecten" to="/effects/mine" />
                        <NavButton icon={faMagic} name="Alle effecten" to="/effects/all" />
                        <NavButton
                            icon={faBook}
                            name="Documentatie"
                            to={{ pathname: "https://pollencode.github.io/rgb-navigation/" }}
                            target="_blank"
                        />
                        {client.user?.admin && (
                            <>
                                <hr />
                                <NavButton icon={faDotCircle} name="Realtime" to="/realtime" />
                                <NavButton icon={faKey} name="API Keys" to="/admin/apikeys" />
                                <NavButton icon={faUsers} name="Gebruikers" to="/admin/users" />
                                <NavButton name="D-gang" to="/admin/dgang" />
                                <NavButton name="LedController" to="/admin/ledcontrol" />
                            </>
                        )}
                    </ul>
                </nav>
                <div className="flex-grow relative flex flex-col overflow-auto">{props.children}</div>
            </div>
            <footer className="text-gray-300 px-2 flex mt-auto md:text-sm text-xs" style={{ background: "#111", borderTop: "1px solid #222" }}>
                <button className="hover:underline mr-5 py-1 inline" onClick={() => client.setAccessToken(undefined)}>
                    <FontAwesomeIcon icon={faSignOutAlt} /> Uitloggen
                </button>
                <a
                    target="_blank"
                    className="hover:underline ml-auto mr-5 py-1 inline-block"
                    href="https://git.ikdoeict.be/stijn.rogiest/rgb-navigation">
                    <FontAwesomeIcon icon={faGitlab} /> GitLab
                </a>
                <a target="_blank" className="hover:underline sm:mr-5 py-1 inline-block" href="https://pollencode.github.io/rgb-navigation/">
                    <FontAwesomeIcon icon={faBook} /> <span className="hidden sm:inline">Help/</span>Documentatie
                </a>
                {/* <p>Welkom, {client.user?.name}</p> */}

                <p className="opacity-50 py-1 sm:inline-block hidden" title={"By " + author}>
                    rgb-navigation v<code>{version}</code>
                </p>
            </footer>
        </div>
    );
}
