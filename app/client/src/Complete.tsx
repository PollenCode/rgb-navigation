import React, { useMemo } from "react";
import { RouteComponentProps } from "react-router";
import jsonwebtoken from "jsonwebtoken";

export function Complete(props: RouteComponentProps<{ id: string }>) {
    let userData = useMemo(() => jsonwebtoken.decode(decodeURIComponent(props.match.params.id)), [props.match.params.id]);

    return (
        <div>
            <pre>{JSON.stringify(userData, null, 2)}</pre>
        </div>
    );
}
