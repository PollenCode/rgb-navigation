import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../AuthContext";

export function CustomEffects() {
    const client = useContext(AuthContext);
    const [effects, setEffects] = useState<{ name: string; code: string; id: number }[] | undefined>();

    useEffect(() => {
        client.getEffects().then(setEffects);
    }, []);

    console.log("effects", effects);

    if (!effects) {
        return <p>loading...</p>;
    }

    return (
        <div>
            <ul>
                {effects.map((e) => (
                    <li key={e.id}>{e.name}</li>
                ))}
            </ul>
        </div>
    );
}
