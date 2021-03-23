import { User } from "@prisma/client";
import "express-serve-static-core";

declare module "express-serve-static-core" {
    export interface Request {
        user?: User;
    }
}
