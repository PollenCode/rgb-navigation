import { IconDefinition } from "@fortawesome/fontawesome-common-types";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export function Button({
    styleType,
    children,
    icon,
    loading,
    allowSmall,
    ...rest
}: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
    icon?: IconDefinition;
    loading?: boolean;
    styleType?: "danger" | "primary" | "secondary";
    allowSmall?: boolean;
}) {
    let normal = styleType === "danger" ? "bg-red-600" : styleType === "secondary" ? "bg-gray-200" : "bg-blue-600";
    let hover = styleType === "danger" ? "bg-red-800" : styleType === "secondary" ? "bg-gray-400" : "bg-blue-800";
    return (
        <button
            {...rest}
            className={`${
                styleType === "secondary" ? "text-blue-600" : "text-white"
            } whitespace-nowrap font-semibold md:px-3 md:py-1 px-2.5 py-0.5 disabled:bg-gray-100 ${normal} rounded-md hover:${hover} focus:scale-95 transform border-2 border-transparent transition`}>
            {loading && <FontAwesomeIcon className="animate-spin mr-1" icon={faCircleNotch} />}
            <span className={`${allowSmall ? "md:inline hidden" : ""}`}>{children}</span>
            {icon && <FontAwesomeIcon icon={icon} className={`${allowSmall ? "md:ml-2" : "ml-2"}`} />}
        </button>
    );
}
