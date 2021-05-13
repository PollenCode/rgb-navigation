import { PrismaClient } from ".prisma/client";
import { Router } from "express";
import debug from "debug";
import { withUser } from "./middleware";
import { sendArduino } from "./socketServer";
import { ByteCodeTarget, ByteType, CompareToken, CompilerContext, IntType, VoidType } from "rgb-compiler";
import { isDevelopment } from "./helpers";
import fs from "fs";

const logger = debug("rgb:effects");
const router = Router();
const prisma = new PrismaClient();

let activeEffectId = -1;

function compile(input: string): [Buffer, number] {
    let context = new CompilerContext();
    let target = new ByteCodeTarget();

    context.defineVariable("r", new ByteType(), true, target.allocateVariableAt(0, new ByteType()));
    context.defineVariable("g", new ByteType(), true, target.allocateVariableAt(1, new ByteType()));
    context.defineVariable("b", new ByteType(), true, target.allocateVariableAt(2, new ByteType()));
    context.defineVariable("index", new IntType(), true, target.allocateVariableAt(4, new IntType()));
    context.defineVariable("timer", new IntType(), true, target.allocateVariableAt(8, new IntType()));

    target.defineDefaultMacros(context);
    context.defineFunction("random", new ByteType(), 0, target.allocateFunction(1));
    context.defineFunction("out", new VoidType(), 1, target.allocateFunction(2));
    context.defineFunction("min", new IntType(), 2, target.allocateFunction(3));
    context.defineFunction("max", new IntType(), 2, target.allocateFunction(4));
    context.defineFunction("map", new IntType(), 5, target.allocateFunction(5));
    context.defineFunction("lerp", new IntType(), 3, target.allocateFunction(6));
    context.defineFunction("clamp", new IntType(), 3, target.allocateFunction(7));
    context.defineFunction("hsv", new VoidType(), 3, target.allocateFunction(8));

    context.parse(input);
    context.typeCheck();
    context.compile(target);

    let [entryPoint, buffer] = target.getLinkedProgram(context);

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
