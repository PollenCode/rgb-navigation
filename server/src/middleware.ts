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

        if(token.tokenId){
            let userToken = await prisma.token.findUnique({ where: { id: token.tokenId } });
            if(!userToken){
                return res.status(401).end();
            }
        }
        if(token.userId){
            let user = await prisma.user.findUnique({ where: { id: token.userId } });
            if (!user) {
                return res.status(401).end();
            }
            if(admin && user.admin == false){
                return res.status(401).end
            }
            if(user){
                req.user = user;
            }
        }
        
        next();
    };
}
