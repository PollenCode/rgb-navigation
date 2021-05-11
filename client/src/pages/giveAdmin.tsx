import { Button } from "../components/Button";
import { AuthContext } from "../AuthContext";
import { useContext, useEffect } from "react";
import { useState } from "react";

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
                <ul className="mt-4 border-collapse border rounded overflow-hidden">
                    {users.map((user: any) => (
                        <li className="border-b last:border-0 text-gray-700 hover:bg-gray-50 transition flex items-center justify-between">
                            <p className="ml-5">Gebruiker: {user.name}</p>
                            {!user.admin && 
                            <Button
                                style={{ margin: "0.5em" }}
                                type="button"
                                onClick={() => {
                                    client.giveAdmin(user);
                                    setMessage("Admin gegeven aan user: " + user.name);
                                }}>
                                Geef Admin
                            </Button>}
                            {user.admin && 
                            <Button
                                style={{ margin: "0.5em" }}
                                type="button"
                                onClick={() => {
                                    client.takeAdmin(user);
                                    setMessage("Admin afgenomen vam user: " + user.name);
                                }}>
                                Neem Admin
                            </Button>}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
