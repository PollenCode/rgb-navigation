import { Button } from "../components/Button";
import { AuthContext } from "../AuthContext";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { List, ListItem } from "../components/List";

export function GiveAdmin() {
    let client = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [message, setMessage] = useState("");

    useEffect(() => {
        client.getUsers().then((e) => {
            setUsers(e.users);
        });
    }, [message]);

    return (
        <div className="flex justify-center px-1 md:px-4 pt-4">
            <div style={{ width: "1000px" }}>
                <p className="mt-5">{message}</p>
                <List>
                    {users.map((user: any) => (
                        <ListItem key={user.id}>
                            <p className="ml-5">Gebruiker: {user.name}</p>
                            {!user.admin && (
                                <Button
                                    style={{ margin: "0.5em 0.5em 0.5em auto" }}
                                    type="button"
                                    onClick={() => {
                                        client.giveAdmin(user);
                                        setMessage("Admin gegeven aan user: " + user.name);
                                    }}>
                                    Geef Admin
                                </Button>
                            )}
                            {user.admin && (
                                <Button
                                    style={{ margin: "0.5em 0.5em 0.5em auto" }}
                                    type="button"
                                    onClick={() => {
                                        client.takeAdmin(user);
                                        setMessage("Admin afgenomen vam user: " + user.name);
                                    }}>
                                    Neem Admin
                                </Button>
                            )}
                        </ListItem>
                    ))}
                </List>
            </div>
        </div>
    );
}
