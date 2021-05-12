import { PrismaClient } from ".prisma/client";
import { Router } from "express";
import debug from "debug";
import { withUser } from "./middleware";
import { sendArduino } from "./socketServer";
import { ByteType, CompareToken, CompilerContext, IntType, VoidType } from "rgb-compiler";
import { isDevelopment } from "./helpers";
import fs from "fs";

const logger = debug("rgb:effects");
const router = Router();
const prisma = new PrismaClient();

let activeEffectId = -1;

function compile(input: string): [Buffer, number] {
    let context = new CompilerContext();
    context.defineDefaultMacros();
    context.defineVariableAt("r", new ByteType(), 0, true);
    context.defineVariableAt("g", new ByteType(), 1, true);
    context.defineVariableAt("b", new ByteType(), 2, true);
    context.defineVariableAt("index", new IntType(), 4, true);
    context.defineVariableAt("timer", new IntType(), 8, true);
    context.defineFunction("random", 1, new ByteType(), 0);
    context.defineFunction("out", 2, new VoidType(), 1);
    context.defineFunction("min", 3, new IntType(), 2);
    context.defineFunction("max", 4, new IntType(), 2);
    context.defineFunction("map", 5, new IntType(), 5);
    context.defineFunction("lerp", 6, new IntType(), 3);
    context.defineFunction("clamp", 7, new IntType(), 3);
    context.defineFunction("hsv", 8, new VoidType(), 3);
    context.compile(input);
    context.typeCheck();

    let [entryPoint, buffer] = context.getLinked();

    if (isDevelopment) {
        fs.writeFileSync("../arduino/testing/input.hex", buffer);
    }

    return [buffer, entryPoint];
}

router.post("/effect/build/:id", async (req, res, next) => {
    let id = parseInt(req.params.id);
    let upload = !!req.query.upload;
    if (isNaN(id)) {
        return res.status(400).end();
    }

    let effect = await prisma.effect.findUnique({
        where: {
            id: id,
        },
    });

    if (!effect) {
        return res.status(404).end();
    }

    try {
        let [compiled, entryPoint] = compile(effect.code);
        effect = await prisma.effect.update({
            where: {
                id: id,
            },
            data: {
                compiled: compiled,
                entryPoint: entryPoint,
                lastError: null,
            },
        });
    } catch (ex) {
        logger("compile error", ex.message);
        effect = await prisma.effect.update({
            where: {
                id: id,
            },
            data: {
                lastError: ex.message,
            },
        });
        return res.json({
            status: "error",
            error: ex.message,
        });
    }

    if (upload) {
        activeEffectId = id;
        sendArduino({ type: "uploadProgram", byteCode: effect.compiled!.toString("hex"), entryPoint: effect.entryPoint! });
    }
    res.json({ status: "ok" });
});

router.get("/effect", async (req, res, next) => {
    let effects = await prisma.effect.findMany({
        select: {
            name: true,
            id: true,
            code: req.query.code === "true" ? true : false,
            author: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });
    res.json(effects.map((e) => ({ ...e, active: activeEffectId === e.id })));
});

router.delete("/effect/:id", withUser(false), async (req, res, next) => {
    let id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).end();
    }

    let effect = await prisma.effect.findUnique({
        where: {
            id: id,
        },
    });

    if (!effect) {
        logger("user %d tried to delete effect that doesn't exist (%d)", req.user!.id, id);
        return res.status(404).end();
    }
    if (effect.authorId !== req.user!.id) {
        logger("user %d tried to delete effect that isn't his (%s)", req.user.id, effect.name);
        return res.status(403).end();
    }

    await prisma.effect.delete({
        where: {
            id: effect.id,
        },
    });

    res.end();
});

router.post("/effect", withUser(false), async (req, res, next) => {
    let { code, name } = req.body;

    let existing = await prisma.effect.findUnique({
        where: {
            name,
        },
    });

    if (existing) {
        return res.status(400).end("effect with name already exists");
    }

    let effect = await prisma.effect.create({
        data: {
            name: name,
            code: code,
            author: {
                connect: {
                    id: req.user!.id,
                },
            },
        },
        select: {
            code: true,
            name: true,
            id: true,
            author: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    res.json(effect);
});

router.patch("/effect", withUser(false), async (req, res, next) => {
    let { code, name, id } = req.body;

    let existing = await prisma.effect.findUnique({
        where: {
            id: id,
        },
    });

    if (!existing) {
        return res.status(404).end();
    }

    if (existing.authorId !== req.user.id) {
        logger("user %d tried to update other user's effect (%s)", req.user.id, name);
        return res.status(403).end();
    }

    let effect = await prisma.effect.update({
        where: {
            id: existing.id,
        },
        data: {
            code: code,
            name: name,
        },
        select: {
            code: true,
            name: true,
            id: true,
            author: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    res.json(effect);
});

router.get("/effect/:id", withUser(false), async (req, res, next) => {
    let id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).end();
    }

    let effect = await prisma.effect.findUnique({
        where: {
            id: id,
        },
        select: {
            code: true,
            name: true,
            id: true,
            author: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    if (!effect) {
        return res.status(404).end();
    }

    res.json(effect);
});

// router.post("/effect/build/:id", async (req, res, next) => {
//     const id = parseInt(req.params.id);
//     if (isNaN(id)) {
//         return res.status(400).end();
//     }
//     res.end();
// });

export default router;
