import { IconDefinition } from "@fortawesome/fontawesome-common-types";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export function Button({
    danger,
    children,
    icon,
    loading,
    allowSmall,
    ...rest
}: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
    icon?: IconDefinition;
    loading?: boolean;
    danger?: boolean;
    allowSmall?: boolean;
}) {
    return (
        <button
            {...rest}
            className={`whitespace-nowrap font-semibold md:px-3 md:py-1 px-2.5 py-0.5 disabled:bg-gray-200 ${
                danger ? "bg-red-600" : "bg-blue-600"
            } text-white rounded-md hover:bg-transparent hover:${danger ? "text-red-600" : "text-blue-600"} border-2 border-transparent hover:${
                danger ? "border-red-600" : "border-blue-600"
            } transition`}>
            {loading && <FontAwesomeIcon className="animate-spin mr-1" icon={faCircleNotch} />}
            <span className={`${allowSmall ? "md:inline hidden" : ""}`}>{children}</span>
            {icon && <FontAwesomeIcon icon={icon} className={`${allowSmall ? "md:ml-2" : "ml-2"}`} />}
        </button>
    );
}
