import { LedControllerServerMessage } from "rgb-navigation-api";
import { serverPath } from "rgb-navigation-api";
import { Button } from "../components/Button";
import { AuthContext } from "../AuthContext";
import { useContext } from "react";

export function GiveAdmin() {
    let client = useContext(AuthContext);
    return (
        <div className="flex items-center flex-col min-h-screen justify-center">
            <h1 className="text-4xl font-bold mb-8">Admin</h1>
            <div className="flex items-center justify-center  flex-row">
                <div className="flex items-center flex-col ">
                    <Button
                        style={{ margin: "0.5em" }}
                        type="button"
                        onClick={async () => {
                            client.giveAdminToAll();
                        }}>
                        Give
                    </Button>
                </div>
            </div>
        </div>
    );
}