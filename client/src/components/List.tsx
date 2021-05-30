import { HTMLAttributes } from "react";

export function List({ className, ...props }: HTMLAttributes<HTMLUListElement>) {
    return <ul className={`mt-4 border-collapse border rounded ${className}`} {...props} />;
}

export function ListItem({ active, error, className, ...props }: HTMLAttributes<HTMLLIElement> & { active?: boolean; error?: boolean }) {
    return (
        <li
            className={`border-b last:border-0 bg-white text-gray-700 hover:bg-gray-50 transition cursor-pointer flex items-center ${
                error ? "bg-red-50" : active ? "bg-blue-50" : ""
            } ${className}`}
            {...props}
        />
    );
}
