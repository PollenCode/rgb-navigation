import express from "express";
import { PrismaClient } from "@prisma/client";
import { validateUserAccessToken } from "./auth";

let prisma = new PrismaClient();

export function withUser() {
    return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let auth = req.headers["authorization"];
        if (!auth || !auth.startsWith("Bearer ")) {
            return res.status(401).end();
        }
        auth = auth.substring("Bearer ".length);

        let token = validateUserAccessToken(auth);
        console.log("token");
        if (!token) {
            return res.status(401).end();
        }

        let user = await prisma.user.findUnique({ where: { id: token.userId } });
        if (!user) {
            return res.status(401).end();
        }
        console.log("user");
        req.user = user;
        next();
    };
}
