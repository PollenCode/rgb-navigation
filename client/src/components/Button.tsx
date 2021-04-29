import { IconDefinition } from "@fortawesome/fontawesome-common-types";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export function Button({
    danger,
    children,
    icon,
    loading,
    ...rest
}: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
    icon?: IconDefinition;
    loading?: boolean;
    danger?: boolean;
}) {
    return (
        <button
            {...rest}
            className={`font-semibold px-3 py-1 disabled:bg-gray-200 ${
                danger ? "bg-red-600" : "bg-blue-600"
            } text-white rounded-md hover:bg-transparent hover:${danger ? "text-red-600" : "text-blue-600"} border-2 border-transparent hover:${
                danger ? "border-red-600" : "border-blue-600"
            } transition`}>
            {loading && <FontAwesomeIcon className="animate-spin mr-1" icon={faCircleNotch} />}
            {children}
            {icon && <FontAwesomeIcon icon={icon} className="ml-1" />}
        </button>
    );
}
