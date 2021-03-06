import { Button } from "../components/Button";
import { AuthContext } from "../AuthContext";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { List, ListItem } from "../components/List";
import { User } from "rgb-navigation-api";

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
                    {users.map((user: User) => (
                        <ListItem key={user.id}>
                            <p className="ml-5">
                                {user.name || user.id} {user.email && <small className="opacity-50">({user.email})</small>}
                            </p>
                            {!user.admin && (
                                <Button
                                    style={{ margin: "0.5em 0.5em 0.5em auto" }}
                                    type="button"
                                    onClick={() => {
                                        client.giveAdmin(user.id);
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
                                        client.takeAdmin(user.id);
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
