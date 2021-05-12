import { HTMLAttributes } from "react";

export function List({ className, ...props }: HTMLAttributes<HTMLUListElement>) {
    return <ul className={`mt-4 border-collapse border rounded overflow-hidden ${className}`} {...props} />;
}

export function ListItem({ active, className, ...props }: HTMLAttributes<HTMLLIElement> & { active?: boolean }) {
    return (
        <li
            className={`border-b last:border-0 text-gray-700 hover:bg-gray-50 transition cursor-pointer flex items-center ${
                active ? "bg-blue-50" : ""
            } ${className}`}
            {...props}
        />
    );
}
