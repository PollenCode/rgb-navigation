import React, { useMemo } from "react";
import { RouteComponentProps } from "react-router";
import jsonwebtoken from "jsonwebtoken";

export function Complete(props: RouteComponentProps<{ id: string }>) {
    let { email, name, picture } = useMemo(() => jsonwebtoken.decode(decodeURIComponent(props.match.params.id)) as any, [props.match.params.id]);

    return (
        <div className="items-center justify-center min-h-screen flex flex-col">
            <h2 className="text-lg font-semibold text-blue-700">{name}</h2>
            <h3 className="">{email}</h3>
            {picture && <img className="rounded m-3" src={picture} alt="profile" />}
        </div>
    );
}
