import { Button } from "../components/Button";
import { AuthContext } from "../AuthContext";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { List, ListItem } from "../components/List";

export function Token() {
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
                        type="button"
                        onClick={() => {
                            client.createApiKey().then((e) => {
                                setApiKey(e.token);
                            });
                        }}>
                        Token Aanvragen
                    </Button>
                    <p className="mt-4 ml-5">Token:</p>
                    <p className="border ml-5 w-100 h-15 p-1 break-words overflow-hidden">{apiKey}</p>
                </div>
                <p className="mt-5">{message}</p>

                {apiKeys.length ? (
                    <List>
                        {apiKeys.map((tokenList: any) => (
                            <ListItem>
                                <p className="ml-5">Token Id: {tokenList.id}</p>
                                <p className="ml-5">Datum aangevraagd: {tokenList.made}</p>
                                <Button
                                    style={{ margin: "0.5em 0.5em 0.5em auto" }}
                                    type="button"
                                    onClick={() => {
                                        client.deleteApiKey(tokenList.id);
                                        setMessage("De token met Id: " + tokenList.id + " is verwijderd.");
                                    }}>
                                    Delete
                                </Button>
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <p className="my-5 font-bold">Er zijn not geen api keys aangevraagd.</p>
                )}
            </div>
        </div>
    );
}
