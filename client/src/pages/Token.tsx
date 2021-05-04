import { Button } from "../components/Button";
import { AuthContext } from "../AuthContext";
import { useContext } from "react";
import { useState } from "react";




export function Token(){
    let client = useContext(AuthContext);
    const [token, setToken] = useState('');
    
    return(
        <div className="flex items-center flex-col min-h-screen justify-center">
            <h1 className="text-4xl font-bold mb-8">Token Creator</h1>
            <Button
                style={{ margin: "0.5em" }}
                type="button"
                onClick={async () => {
                    client.getToken().then((e) => {
                        setToken(e.jwt);
                      })
                }}>
                Aanvragen
            </Button>
            <div className="flex flex-row mt-5">
                <p className="mr-2">Token:</p>
                <p>{token}</p>
            </div>
        </div>
    )
}