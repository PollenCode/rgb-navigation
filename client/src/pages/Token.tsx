import { Button } from "../components/Button";
import { AuthContext } from "../AuthContext";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { tokenToString } from "typescript";




export function Token(){
    let client = useContext(AuthContext);
    const [token, setToken] = useState('');
    const [tokens, setTokens] = useState([]);
    

    useEffect(() => {
        client.getTokens().then((e) => {
            setTokens(e.tokens);
        })
    }, [token]);
    
    return(
        <div className="flex justify-center px-1 md:px-4 pt-4">
            <div style={{ width: "1000px" }}>
                <div className="flex flex-row align-middle">
                    <Button
                        type="button"
                        onClick={() => {
                            client.getToken().then((e) => {
                                setToken(e.jwt);
                            })
                        }}>
                        Token Aanvragen
                    </Button>
                    <p className="mt-4 ml-5">Token:</p>
                    <p className="border ml-5 w-100 h-15 p-1 break-words overflow-hidden">{token}</p>
                </div>
                
                <ul className="mt-4 border-collapse border rounded overflow-hidden">
                    {tokens.map((tokenList: any) => (
                            <li className="border-b last:border-0 text-gray-700 hover:bg-gray-50 transition flex items-center justify-between">
                                <p className="ml-5">Token Id: {tokenList.id}</p>
                                <Button
                                    style={{ margin: "0.5em" }}
                                    type="button"
                                    onClick={() => {
                                        client.getToken().then((e) => {
                                            setToken(e.jwt);
                                        })
                                    }}>
                                    Delete
                                </Button>
                            </li>
                    ))}
                </ul>

            </div>
        </div>
    )
}