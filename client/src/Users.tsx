import { Button } from "./components/Button";
import { RouteComponentProps } from "react-router";
import { LedControllerServerMessage, serverPath } from "rgb-navigation-api";
import { useEffect, useState } from "react";

export function UsersList() {
    const [users, setusers] = useState([]);
    async function fetchusers() {
        let response = await fetch(serverPath + "/api/users", {
            method: "GET",
        });
        let data = await response.json();
        setusers(data.user);
        console.log(data.user);
    }
    useEffect(() => {
        fetchusers();
    }, []);
    return (
        <p className="text-red-700">
            {users.map((user: any) => (
                <li key={user.id}>{user.name}</li>
            ))}
        </p>
    );
}
