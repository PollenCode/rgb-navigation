export function Button({
    color,
    ...rest
}: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & { color?: string }) {
    let col = color ?? "blue-600";
    return (
        <button
            {...rest}
            className={`font-semibold px-4 py-2 bg-${col} text-white rounded-md hover:bg-transparent hover:text-${col} border-2 border-transparent hover:border-${col} transition`}
        />
    );
}
