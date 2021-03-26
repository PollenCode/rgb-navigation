export function Button({ color, ...rest }: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>) {
    return (
        <button
            {...rest}
            className={`font-semibold px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-transparent hover:text-blue-600 border-2 border-transparent hover:border-blue-600 transition`}
        />
    );
}
