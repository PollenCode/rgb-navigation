import querystring from "querystring";
import { isDevelopment } from "./helpers";

// google oauth client id 401281174895-455bd3vgt528atv2t0smbto6mtlhnrsq.apps.googleusercontent.com
// google oauth secret vv0D68w4OExngTjxGZPOB34J

const GOOGLE_CLIENT_ID = "401281174895-455bd3vgt528atv2t0smbto6mtlhnrsq.apps.googleusercontent.com";

export function getGoogleAuthURL() {
    // Thx https://tomanagle.medium.com/google-oauth-with-node-js-4bff90180fe6
    let options = {
        redirect_uri: `${isDevelopment ? "http://localhost:3001/oauth/complete" : "/oauth/complete"}`,
        client_id: GOOGLE_CLIENT_ID,
        access_type: "offline",
        response_type: "code",
        prompt: "consent",
        scope: ["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"].join(" "),
    };

    return `https://accounts.google.com/o/oauth2/v2/auth?${querystring.stringify(options)}`;
}
