import ms from "ms";
import { useEffect, useMemo, useState } from "react";

export function Timer(props: { date: Date }) {
    const [lastEdited, setLastedited] = useState(ms(new Date().getTime() - props.date.getTime()));

    useEffect(() => {
        function update() {
            setLastedited(ms(new Date().getTime() - props.date.getTime()));
        }

        let i = setInterval(update, 1000);
        return () => {
            clearInterval(i);
        };
    });

    return <>{lastEdited}</>;
}
