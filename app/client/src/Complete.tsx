import React, { useMemo } from "react";
import { RouteComponentProps } from "react-router";
import { Button } from "./components/Button";

export function Complete(props: RouteComponentProps<{ id: string }>) {
    let { email, name, picture, accessToken } = useMemo(() => JSON.parse(atob(decodeURIComponent(props.match.params.id))) as any, [
        props.match.params.id,
    ]);

    return (
        <div className="items-center justify-center min-h-screen flex flex-col">
            <h2 className="text-lg font-semibold text-blue-700">{name}</h2>
            <h3 className="">{email}</h3>
            {picture && <img className="rounded m-3" src={picture} alt="profile" />}
            <Button
                onClick={async () => {
                    let res = await fetch("http://localhost:3001/user", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${accessToken}` },
                    });
                    let data = await res.json();
                    console.log(data);
                    alert(JSON.stringify(data, null, 2));
                }}>
                Get user info
            </Button>
        </div>
    );
}
