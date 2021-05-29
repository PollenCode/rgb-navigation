import { PrismaClient } from ".prisma/client";
import { Router } from "express";
import debug from "debug";
import { withAuth } from "./middleware";
import { roomNumberToLine, sendLedController } from "./socketServer";
import { ByteCodeTarget, ByteType, CompareToken, IntType, parseProgram, Scope, Var, VoidType } from "rgb-compiler";
import { isDevelopment } from "./helpers";
import fs from "fs";
import { IdeInfo } from "rgb-navigation-api";
import { ideInfo } from "./ideInfo";

const MAX_EFFECT_PER_USER = 10;
const LED_COUNT = 784;

const logger = debug("rgb:effects");
const router = Router();
const prisma = new PrismaClient();

let activeEffectId = -1;
let lastVariables: ReadonlyMap<string, Var>;

function compile(input: string): [Buffer, number, ReadonlyMap<string, Var>] {
    let scope = new Scope();
    let target = new ByteCodeTarget();

    scope.defineVar("r", { type: new ByteType(), location: target.allocateVariableAt(0, new ByteType()) });
    scope.defineVar("g", { type: new ByteType(), location: target.allocateVariableAt(1, new ByteType()) });
    scope.defineVar("b", { type: new ByteType(), location: target.allocateVariableAt(2, new ByteType()) });
    scope.defineVar("index", { type: new IntType(), location: target.allocateVariableAt(4, new IntType()) });
    scope.defineVar("timer", { type: new IntType(), location: target.allocateVariableAt(8, new IntType()) });
    scope.defineVar("LED_COUNT", { type: new IntType(), constant: true });
    scope.setVarKnownValue("LED_COUNT", LED_COUNT);

    target.defineDefaultMacros(scope);
    scope.defineFunc("random", { returnType: new ByteType(), parameterCount: 0, location: target.allocateFunction(1) });
    scope.defineFunc("min", { returnType: new IntType(), parameterCount: 2, location: target.allocateFunction(3) });
    scope.defineFunc("max", { returnType: new IntType(), parameterCount: 2, location: target.allocateFunction(4) });
    scope.defineFunc("map", { returnType: new IntType(), parameterCount: 5, location: target.allocateFunction(5) });
    scope.defineFunc("lerp", { returnType: new IntType(), parameterCount: 3, location: target.allocateFunction(6) });
    scope.defineFunc("clamp", { returnType: new IntType(), parameterCount: 3, location: target.allocateFunction(7) });
    scope.defineFunc("hsv", { returnType: new VoidType(), parameterCount: 3, location: target.allocateFunction(8) });

    let program = parseProgram(input);
    program.setTypes(scope);
    target.compile(program);

    let [entryPoint, buffer] = target.getLinkedProgram();

    if (isDevelopment) {
        fs.writeFileSync("../arduino/testing/input.hex", buffer);
    }

    return [buffer, entryPoint, scope.variables];
}

router.post("/effect/:id/build", withAuth(true, true), async (req, res, next) => {
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

    let compiled, entryPoint, lastVars;
    try {
        [compiled, entryPoint, lastVars] = compile(effect.code);
        effect = await prisma.effect.update({
            where: {
                id: id,
            },
            data: {
                compiled: compiled,
                entryPoint: entryPoint,
                lastError: null,
                modifiedAt: new Date(),
            },
        });
    } catch (ex) {
        logger("compile error", ex);
        effect = await prisma.effect.update({
            where: {
                id: id,
            },
            data: {
                lastError: String(ex),
                modifiedAt: new Date(),
            },
        });
        return res.json({
            status: "error",
            error: String(ex),
        });
    }

    if (upload) {
        activeEffectId = id;
        lastVariables = lastVars;
        sendLedController({ type: "uploadProgram", byteCode: effect.compiled!.toString("hex"), entryPoint: effect.entryPoint! });
    }
    res.json({ status: "ok" });
});

router.get("/effect", withAuth(false, true), async (req, res, next) => {
    let effects = await prisma.effect.findMany({
        where: {
            authorId: req.user && req.query.onlyUser === "true" ? req.user.id : undefined,
        },
        select: {
            name: true,
            id: true,
            code: req.query.code === "true" ? true : false,
            lastError: true,
            modifiedAt: true,
            createdAt: true,
            author: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: {
            modifiedAt: "desc",
        },
    });
    // Move active effect to beginning of array
    if (activeEffectId >= 0) {
        let activeIndex = effects.findIndex((e) => e.id === activeEffectId);
        if (activeIndex >= 0) {
            effects.unshift(effects.splice(activeIndex, 1)[0]);
        }
    }
    res.json(effects.map((e) => ({ ...e, active: activeEffectId === e.id })));
});

router.delete("/effect/:id", withAuth(false), async (req, res, next) => {
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

router.post("/effect", withAuth(false), async (req, res, next) => {
    let { code, name } = req.body;

    let existing = await prisma.effect.findUnique({
        where: {
            name,
        },
    });

    if (existing) {
        return res.status(400).json({ status: "error", error: "Effect with set name already exists." });
    }

    let userEffectCount = await prisma.effect.count({ where: { authorId: req.user.id } });
    if (!req.user.admin && userEffectCount > MAX_EFFECT_PER_USER) {
        return res.status(400).json({
            status: "error",
            error: `Reached effect count limit, a max of ${MAX_EFFECT_PER_USER} effects per user is allowed. Please delete some effects to create new ones.`,
        });
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

    res.json({
        status: "ok",
        effect,
    });
});

router.patch("/effect", withAuth(false), async (req, res, next) => {
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
            modifiedAt: new Date(),
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

router.get("/effect/:id", withAuth(false), async (req, res, next) => {
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
            modifiedAt: true,
            createdAt: true,
            lastError: true,
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

router.post("/effectVar/:varName/:value", withAuth(true, true), async (req, res, next) => {
    let value = parseInt(req.params.value);
    if (isNaN(value)) {
        return res.status(406).end("invalid value, must be number");
    }

    let v = lastVariables.get(req.params.varName);
    if (!v) {
        return res
            .status(404)
            .end("variable not found in currently running program, available variables: " + Array.from(lastVariables.keys()).join(", "));
    }
    if (v.constant) {
        return res.status(400).end("the variable you tried to assign is constant, please convert it to a normal variable");
    }

    sendLedController({
        type: "setVar",
        location: v.location! as number,
        size: v.type.size,
        value: value,
    });

    res.status(201).end();
});

router.post("/route", withAuth(true, true), async (req, res, next) => {
    let data = req.body;
    sendLedController({
        type: "enableLine",
        r: data.r,
        g: data.g,
        b: data.b,
        duration: data.duration,
        endLed: data.endLed,
        startLed: data.startLed,
    });
    res.status(201).end();
});

router.post("/roomRoute", withAuth(true, true), async (req, res, next) => {
    let data = req.body;
    sendLedController(roomNumberToLine(data.roomNumber));
    res.status(201).end();
});

router.get("/ideInfo", async (req, res, next) => {
    res.json(ideInfo);
});

export default router;
