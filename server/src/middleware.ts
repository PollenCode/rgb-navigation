import express from "express";
import { PrismaClient } from "@prisma/client";
import { validateUserAccessToken } from "./auth";
import { Schema } from "typed-object-validator";
import { isDevelopment } from "./helpers";

let prisma = new PrismaClient();

export function withAuth(requireAdmin: boolean, allowToken: boolean = false) {
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
            if (!userToken || !allowToken) {
                return res.status(401).end();
            }
        }

        if ("userId" in token) {
            let user = await prisma.user.findUnique({ where: { id: token.userId } });
            if (!user || (requireAdmin && !user.admin)) {
                return res.status(401).end();
            }
            req.user = user;
        }

        next();
    };
}

export function withValidator(schema: Schema<any>) {
    return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let err = schema.validate(req.body, { abortEarly: true });
        if (err) {
            if (isDevelopment) {
                return res.status(406).json(err);
            } else {
                return res.status(406).end();
            }
        }

        next();
    };
}
