import { Button } from "../components/Button";
import { AuthContext } from "../AuthContext";
import { useContext } from "react";
import { useState } from "react";

function sendApi() {
    fetch(
        "https://webwsp.aps.kuleuven.be/sap/opu/odata/sap/zc_ep_uurrooster_oauth_srv/classEvents('5583943320210518081500111500')/locations?$format=json",
        {
            headers: {
                accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                "accept-language": "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7",
                "cache-control": "max-age=0",
                "sec-ch-ua": '" Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
                "sec-ch-ua-mobile": "?0",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "none",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                cookie: "_ga=GA1.2.1355805991.1581872069; sap-login-XSRF_WSP=20210127114438-ICEWyJNcOh_nF_Q7mrIYbA%3d%3d; OptanonAlertBoxClosed=2021-02-15T10:23:41.678Z; _gid=GA1.2.743578458.1621250078; sap-usercontext=sap-client=200; ROUTEID=.2; NSC_JOjpa5jmdauummwdhuh43peq3rrvtbT=28d4a3da8b26c0a4947a85dbf028d09803b9add2564f51f79db54ad90d0e6be0127224af; MYSAPSSO2=AjQxMDMBABhSADAANwA5ADMANQAwADMAIAAgACAAIAACAAYyADAAMAADABBXAFMAUAAgACAAIAAgACAABAAYMgAwADIAMQAwADUAMQA4ADAAOAAyADYABQAEAAAACAkAAk4A%2fwN9MIIDeQYJKoZIhvcNAQcCoIIDajCCA2YCAQExCzAJBgUrDgMCGgUAMAsGCSqGSIb3DQEHAaCCAiwwggIoMIIB6AIBADAJBgcqhkjOOAQDMGExCzAJBgNVBAYTAkRFMRwwGgYDVQQKExNNeVNBUC5jb20gV29ya3BsYWNlMREwDwYDVQQLEwhLVUxldXZlbjEOMAwGA1UECxMFTFVESVQxETAPBgNVBAMTCEtVTEVVVkVOMB4XDTAzMTIyMTA4MTgyMloXDTM4MDEwMTAwMDAwMVowYTELMAkGA1UEBhMCREUxHDAaBgNVBAoTE015U0FQLmNvbSBXb3JrcGxhY2UxETAPBgNVBAsTCEtVTGV1dmVuMQ4wDAYDVQQLEwVMVURJVDERMA8GA1UEAxMIS1VMRVVWRU4wgfEwgagGByqGSM44BAEwgZwCQQD%2f1chirA9xpDUz281G1PMog1R1wwG8mFkiXAza2ax7N%2f80bJlOrU2QZ1hmq3lxjmSzNlw%21WliJexZFtxtW8P0TAhUAskIz1ltDUfVC4AOpT0hnkALpHUcCQE27z627W0ELAwIlf%21FFuRuxiJQQy26CM0GcA%2fTTH71Guw1DR1WWZolz1S7MIqOL1AGWzhVHyRdxmWE9h6cyKhADRAACQQCNCXBS4ET%2123YR8lv8Y8yzoo3%21FejAAm%2f1f%21Q38EkJi8YUoIxVPrhmOgesDXNeRNPBDmkQWp6E%2fz2IXr%2ftDm0lMAkGByqGSM44BAMDLwAwLAIUTQJujC16vkswC%21QLVDkXPL1dmj0CFFSK3VlFMG%2f5i0xoYP6L9DpfLPKzMYIBFTCCARECAQEwZjBhMQswCQYDVQQGEwJERTEcMBoGA1UEChMTTXlTQVAuY29tIFdvcmtwbGFjZTERMA8GA1UECxMIS1VMZXV2ZW4xDjAMBgNVBAsTBUxVRElUMREwDwYDVQQDEwhLVUxFVVZFTgIBADAJBgUrDgMCGgUAoF0wGAYJKoZIhvcNAQkDMQsGCSqGSIb3DQEHATAcBgkqhkiG9w0BCQUxDxcNMjEwNTE4MDgyNjU2WjAjBgkqhkiG9w0BCQQxFgQUHxVxahFkgOBy6GcRaIS804PnCpUwCQYHKoZIzjgEAwQvMC0CFHQshqqbFiTy2nDNZWsncIB3TjXoAhUAjseh0UNUicTS0vNWov1YP%21taa5I%3d; SAP_SESSIONID_WSP_200=y9-WXtsWqIQIkBmYqw72es6Oedy3shHrv9AAUFaUJ78%3d; OptanonConsent=isIABGlobal=false&datestamp=Tue+May+18+2021+10%3A35%3A01+GMT%2B0200+(Midden-Europese+zomertijd)&version=6.10.0&hosts=&landingPath=NotLandingPage&groups=C0001%3A1%2CC0003%3A1%2CC0002%3A1%2CC0004%3A1&AwaitingReconsent=false&consentId=aa6b5730-1430-46d1-a208-b5727ece4fa8&interactionCount=1&geolocation=BE%3BVLG; _gat=1",
            },
            referrerPolicy: "strict-origin-when-cross-origin",
            body: null,
            method: "GET",
            mode: "cors",
        }
    ).then((e) => {
        console.log(e);
    });
}

export function Lessenrooster() {
    return (
        <div className="flex items-center flex-col min-h-screen justify-center">
            <Button
                style={{ margin: "0.5em" }}
                type="button"
                onClick={async () => {
                    sendApi();
                }}
            >
                Verzenden
            </Button>
        </div>
    );
}
