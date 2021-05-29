import { Button } from "../components/Button";
import { AuthContext } from "../AuthContext";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { List, ListItem } from "../components/List";
import { faHandPointRight, faKey, faPlus } from "@fortawesome/free-solid-svg-icons";
import { faKeybase } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export function ApiKeys() {
    let client = useContext(AuthContext);
    const [apiKey, setApiKey] = useState("");
    const [apiKeys, setApiKeys] = useState<any[]>([]);
    const [message, setMessage] = useState("");

    useEffect(() => {
        client.getApiKeys().then((e) => {
            setApiKeys(e.tokens);
        });
    }, [apiKey, message]);

    return (
        <div className="flex justify-center px-1 md:px-4 pt-4">
            <div style={{ width: "1000px" }}>
                <div className="flex flex-row align-middle">
                    <Button
                        icon={faPlus}
                        type="button"
                        onClick={() => {
                            let description = prompt("Geef een beschrijving in voor deze token:");
                            if (!description) return;
                            client.createApiKey(description).then((e) => {
                                setApiKey(e.token);
                            });
                        }}>
                        Nieuwe token
                    </Button>
                    <p className="mt-4 ml-5">Token:</p>
                    <p className="border ml-5 w-100 h-15 p-1 break-words overflow-hidden">{apiKey}</p>
                </div>
                <p className="mt-5">{message}</p>

                <List>
                    {apiKeys.map((token: any) => (
                        <ListItem key={token.id}>
                            <div className="leading-4 mx-3">
                                <p>{token.description || `Token #${token.id}`}</p>
                                <small className="opacity-50">
                                    Aangevraagd {new Date(token.made).toLocaleString()} {token.author && `door ${token.author.name}`}
                                </small>
                            </div>
                            <Button
                                style={{ margin: "0.5em 0.5em 0.5em auto" }}
                                type="button"
                                styleType="danger"
                                onClick={() => {
                                    client.deleteApiKey(token.id);
                                    setMessage("De token met Id: " + token.id + " is verwijderd.");
                                }}>
                                Verwijder
                            </Button>
                        </ListItem>
                    ))}
                    {apiKeys.length === 0 && <p className="text-gray-500 px-4 py-3">Er zijn nog geen api-keys aangevraagd.</p>}
                </List>

                <small className="mt-5 block opacity-50">
                    Bekijk wat je kan doen met deze api-keys{" "}
                    <a className="underline" target="_blank" href="https://pollencode.github.io/rgb-navigation/">
                        hier
                    </a>
                </small>
            </div>
        </div>
    );
}
