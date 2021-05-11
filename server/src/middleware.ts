import express from "express";
import { PrismaClient } from "@prisma/client";
import { validateUserAccessToken } from "./auth";

let prisma = new PrismaClient();

export function withUser(admin: boolean) {
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

        let user = await prisma.user.findUnique({ where: { id: token.userId } });
        let userToken = await prisma.token.findUnique({ where: { id: token.userId } });
        if (!user && !userToken) {
            return res.status(401).end();
        }
        if(user && admin && user.admin == false){
            return res.status(401).end
        }
        if(user){
            req.user = user;
        }
        next();
    };
}
