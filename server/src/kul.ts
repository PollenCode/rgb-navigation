import fetch from "node-fetch";
import querystring from "querystring";
import crypto from "crypto";

// From: https://admin.kuleuven.be/icts/services/dataservices
// To connect to testing environment, use their VPN: https://admin.kuleuven.be/icts/services/extranet/ssl-vpn-pulse-client-en
export function kulGetOAuthUrl() {
    return `https://${process.env.KU_OAUTH_CLIENT_ENDPOINT!}/sap/bc/sec/oauth2/authorize?${querystring.stringify({
        response_type: "code",
        client_id: process.env.KU_OAUTH_CLIENT_ID!,
        redirect_uri: process.env.KU_OAUTH_CLIENT_REDIRECT!,
        scope: "ZC_EP_UURROOSTER_OAUTH_SRV_0001 ZC_EP_OPO_INFO_SRV_0001",
        state: crypto.randomBytes(36).toString("hex"), // TODO
    })}`;
}

export interface KUTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: string;
    refresh_token: string;
    scope: string;
}

export interface KUUserResponse {
    d: {
        results: {
            __metadata: any;
            id: "string";
        }[];
    };
}

export interface KUCourse {
    id: string;
    startTime: string;
    date: string;
    academicYear: string;
    endTime: string;
    weekDay: string;
    ects: string;
    shortDescription: string;
    longDescription: string;
    groupinfoGeneral: string;
    groupinfoDetail: string;
    locations: {
        results: {
            __metadata: any;
            eventId: string;
            id: string;
            buildingNumber: string;
            roomNumber: string;
            roomName: string;
            coordY: string;
            coordX: string;
            buildingName: string;
            city: string;
            street: string;
            mnemonic: string;
        }[];
    };
    teachers: {
        results: { __metadata: any; eventId: string; id: string; name: string; personnelNumber: string }[];
    };
}

export interface KUScheduleResponse {
    d: {
        results: (KUCourse & {
            __metadata: any;
        })[];
    };
}

const KU_BASIC_AUTH = Buffer.from(
    encodeURIComponent(process.env.KU_OAUTH_CLIENT_ID!) + ":" + encodeURIComponent(process.env.KU_OAUTH_CLIENT_SECRET!),
    "utf-8"
).toString("base64");

/**
 * Parses date in format "PT12H45M00S"
 */
export function parseKulCourseTime(timeString: string) {
    let hour = parseInt(timeString.substr(2, 2));
    let minute = parseInt(timeString.substr(5, 2));
    let seconds = parseInt(timeString.substr(8, 2));
    if (isNaN(hour) || isNaN(minute) || isNaN(seconds)) return null;
    return { hour: hour, minute: minute, seconds: seconds };
}

/**
 * Parses date in format "\/Date(1638316800000)\/"
 */
export function parseKulCourseDate(dateString: string) {
    let match = dateString.match(/[0-9]+/);
    if (match) {
        let timestamp = parseInt(match[0]);
        if (isNaN(timestamp)) {
            return null;
        }
        return new Date(timestamp);
    } else {
        return null;
    }
}

export async function kulValidateOAuthCode(code: string) {
    let tokenUrl = `https://${process.env.KU_OAUTH_CLIENT_ENDPOINT!}/sap/bc/sec/oauth2/token?${querystring.stringify({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: process.env.KU_OAUTH_CLIENT_REDIRECT!,
    })}`;
    console.log("tokenUrl", tokenUrl);

    let tokenRes = await fetch(tokenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${KU_BASIC_AUTH}`,
        },
    });
    if (!tokenRes.ok) {
        console.error("could not get token from kuleuven", tokenRes.status, tokenUrl, await tokenRes.text());
        return;
    }

    return (await tokenRes.json()) as KUTokenResponse;
}

export async function kulRefreshToken(refreshToken: string) {
    let tokenUrl = `https://${process.env.KU_OAUTH_CLIENT_ENDPOINT!}/sap/bc/sec/oauth2/token?${querystring.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        // redirect_uri: REDIRECT,
    })}`;

    let tokenRes = await fetch(tokenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${KU_BASIC_AUTH}`,
        },
    });

    if (!tokenRes.ok) {
        console.error("kuleuven could not refresh token", tokenUrl, await tokenRes.text());
        return null;
    }

    return (await tokenRes.json()) as KUTokenResponse;
}

export async function kulGetUserInfo(accessToken: string) {
    let userInfoUrl = `https://${process.env.KU_OAUTH_CLIENT_ENDPOINT!}/sap/opu/odata/sap/zc_ep_uurrooster_oauth_srv/users?$format=json&$select=id`;
    let userInfoRes = await fetch(userInfoUrl, {
        method: "GET",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Bearer ${accessToken}`,
        },
    });
    if (!userInfoRes.ok) {
        console.error("could not get user info from kuleuven", userInfoRes.status, userInfoUrl, await userInfoRes.text());
        return null;
    }

    let userInfo: KUUserResponse = await userInfoRes.json();

    if (!userInfo.d || !userInfo.d.results || !userInfo.d.results[0]) {
        console.error("kuleuven returned invalid user info", userInfoUrl, userInfo);
        return null;
    }

    return userInfo;
}

export async function kulGetSchedule(userId: string, accessToken: string, date: Date) {
    let scheduleUrl = `https://${process.env
        .KU_OAUTH_CLIENT_ENDPOINT!}/sap/opu/odata/sap/zc_ep_uurrooster_oauth_srv/users('${userId}')/classEvents?$format=json&$expand=locations,teachers&$filter=${encodeURIComponent(
        `date eq datetime'${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}T00:00:00'`
    )}`;

    let scheduleRes = await fetch(scheduleUrl, {
        method: "GET",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!scheduleRes.ok) {
        console.error("could not get schedule from kuleuven", scheduleRes.status, scheduleUrl, await scheduleRes.text());
        return null;
    }

    return (await scheduleRes.json()) as KUScheduleResponse;
}
