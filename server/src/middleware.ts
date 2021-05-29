import express from "express";
import { PrismaClient } from "@prisma/client";
import { validateUserAccessToken } from "./auth";

let prisma = new PrismaClient();

export function withUser(admin: boolean, userNeeded: boolean = true) {
    return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let auth = req.headers["authorization"];
        if (!auth || !auth.startsWith("Bearer ")) {
            return res.status(401).end();
        }
        auth = auth.substring("Bearer ".length);

        let token = validateUserAccessToken(auth);

        if (!token) {
            return res.status(401).end();
        }

        if ("tokenId" in token) {
            let userToken = await prisma.token.findUnique({ where: { id: token.tokenId } });
            if (!userToken || userNeeded) {
                return res.status(401).end();
            }
        }
        if ("userId" in token) {
            let user = await prisma.user.findUnique({ where: { id: token.userId } });
            if (!user) {
                return res.status(401).end();
            }
            if (admin && user.admin == false) {
                return res.status(401).end;
            }
            if (user) {
                req.user = user;
            }
        }

        next();
    };
}
