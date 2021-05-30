import { Effect, PrismaClient } from ".prisma/client";
import { Router } from "express";
import debug from "debug";
import { withAuth, withValidator } from "./middleware";
import { roomNumberToLine, notifyActiveEffect, notifyLedController } from "./socketServer";
import { ByteCodeTarget, ByteType, CompareToken, IntType, parseProgram, Scope, Var, VoidType } from "rgb-compiler";
import { isDevelopment } from "./helpers";
import fs from "fs";
import { IdeInfo } from "rgb-navigation-api";
import { ideInfo } from "./ideInfo";
import * as tv from "typed-object-validator";

const MAX_EFFECT_PER_USER = 8;
const LED_COUNT = 784;

const logger = debug("rgb:effects");
const router = Router();
const prisma = new PrismaClient();

let activeEffectId = -1;
let lastVariables: ReadonlyMap<string, Var>;
let carrouselInterval = 0;
let effectCarrouselTask: NodeJS.Timeout | undefined = undefined;

async function startEffectCarrousel() {
    effectCarrouselTask = undefined;

    let favorites = await prisma.effect.findMany({
        where: {
            favorite: true,
        },
    });

    if (favorites.length <= 0) {
        return;
    }

    let index = favorites.findIndex((e) => e.id === activeEffectId);
    if (index < 0 || ++index >= favorites.length) {
        index = 0;
    }

    let effect = favorites[index];
    logger("playing next carrousel effect", effect.name, effect.id);
    try {
        let [compiled, entryPoint, lastVars] = compile(effect.code);
        activeEffectId = effect.id;
        lastVariables = lastVars;
        notifyLedController({ type: "uploadProgram", byteCode: compiled.toString("hex"), entryPoint: entryPoint });
        notifyActiveEffect(activeEffectId, carrouselInterval);
    } catch (ex) {
        logger("could not play next carrousel effect with id %d: %s", effect.id, ex);
    }

    effectCarrouselTask = setTimeout(startEffectCarrousel, carrouselInterval);
}

function stopEffectCarrousel() {
    carrouselInterval = 0;
    if (effectCarrouselTask !== undefined) {
        clearTimeout(effectCarrouselTask);
        effectCarrouselTask = undefined;
    }
}

// effectCarrouselTask = setTimeout(startEffectCarrousel, 5000);

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

router.post("/effect/carrousel/:seconds", withAuth(true, true), async (req, res, next) => {
    let seconds = parseInt(req.params.seconds);
    if (isNaN(seconds)) {
        return res.status(406);
    }

    stopEffectCarrousel();

    if (seconds >= 4) {
        carrouselInterval = seconds * 1000;
        await startEffectCarrousel();
    }

    notifyActiveEffect(activeEffectId, carrouselInterval);

    res.end();
});

router.post("/effect/:id/build", withAuth(true, true), async (req, res, next) => {
    let id = parseInt(req.params.id);
    let upload = !!req.query.upload;
    if (isNaN(id)) {
        return res.status(406).end();
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
        stopEffectCarrousel();
        notifyLedController({ type: "uploadProgram", byteCode: effect.compiled!.toString("hex"), entryPoint: effect.entryPoint! });
        notifyActiveEffect(activeEffectId, carrouselInterval);
    }
    res.json({ status: "ok" });
});

router.get("/effect", async (req, res, next) => {
    let authorId = String(req.query.authorId) || undefined;
    let effects = await prisma.effect.findMany({
        where: {
            authorId: authorId,
        },
        select: {
            name: true,
            id: true,
            code: req.query.code === "true" ? true : false,
            lastError: true,
            modifiedAt: true,
            createdAt: true,
            favorite: true,
            author: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: [{ favorite: "desc" }, { modifiedAt: "desc" }],
    });
    // Move active effect to beginning of array
    if (activeEffectId >= 0) {
        let activeIndex = effects.findIndex((e) => e.id === activeEffectId);
        if (activeIndex >= 0) {
            effects.unshift(effects.splice(activeIndex, 1)[0]);
        }
    }
    res.json({
        effects: effects.map((e) => ({ ...e, active: activeEffectId === e.id })),
        activeEffectId: activeEffectId,
        carrouselInterval: carrouselInterval,
    });
});

router.delete("/effect/:id", withAuth(false), async (req, res, next) => {
    let id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(406).end();
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
    if (effect.authorId !== req.user!.id && !req.user.admin) {
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

const CreateEffectRequestSchema = tv.object({
    code: tv.string().min(0).max(2000),
    name: tv.string().min(1).max(30),
});

router.post("/effect", withAuth(false), withValidator(CreateEffectRequestSchema), async (req, res, next) => {
    let data: tv.SchemaType<typeof CreateEffectRequestSchema> = req.body;

    let userEffectCount = await prisma.effect.count({ where: { authorId: req.user.id } });
    if (!req.user.admin && userEffectCount > MAX_EFFECT_PER_USER) {
        return res.status(400).json({
            status: "error",
            error: `Reached effect count limit, a max of ${MAX_EFFECT_PER_USER} effects per user is allowed. Please delete some effects to create new ones.`,
        });
    }

    let effect = await prisma.effect.create({
        data: {
            name: data.name,
            code: data.code,
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

router.patch("/effect/:id", withAuth(true), async (req, res, next) => {
    let id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(406).end();
    }

    await prisma.effect.update({
        where: {
            id: id,
        },
        data: {
            favorite: !!req.query.favorite,
        },
    });

    res.end();
});

router.put("/effect/:id", withAuth(false), withValidator(CreateEffectRequestSchema), async (req, res, next) => {
    let id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(406).end();
    }
    let data: tv.SchemaType<typeof CreateEffectRequestSchema> = req.body;

    let existing = await prisma.effect.findUnique({
        where: {
            id: id,
        },
    });

    if (!existing) {
        return res.status(404).end();
    }

    if (existing.authorId !== req.user.id && !req.user.admin) {
        logger("user %d tried to update other user's effect (%s)", req.user.id, name);
        return res.status(403).end();
    }

    let effect = await prisma.effect.update({
        where: {
            id: existing.id,
        },
        data: {
            code: data.code,
            name: data.name,
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

router.get("/effect/:id", async (req, res, next) => {
    let id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(406).end();
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
    let varName = req.params.varName;
    if (isNaN(value) || !varName) {
        return res.status(406).end("invalid value or varName");
    }
    if (!lastVariables) {
        return res.status(400).end("no program has been uploaded");
    }

    let v = lastVariables.get(varName);
    if (!v) {
        return res
            .status(404)
            .end("variable not found in currently running program, available variables: " + Array.from(lastVariables.keys()).join(", "));
    }
    if (v.constant) {
        return res.status(400).end("the variable you tried to assign is constant, please convert it to a normal variable");
    }

    notifyLedController({
        type: "setVar",
        location: v.location! as number,
        size: v.type.size,
        value: value,
    });

    res.status(201).end();
});

const RouteRequestSchema = tv.object({
    r: tv.number().min(0).max(255),
    g: tv.number().min(0).max(255),
    b: tv.number().min(0).max(255),
    startLed: tv.number().min(0).max(LED_COUNT),
    endLed: tv.number().min(0).max(LED_COUNT),
    duration: tv.number().min(0).max(1000),
});

router.post("/route", withAuth(true, true), withValidator(RouteRequestSchema), async (req, res, next) => {
    let data = req.body as tv.SchemaType<typeof RouteRequestSchema>;
    notifyLedController({
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

router.post("/roomRoute/:n", withAuth(true, true), async (req, res, next) => {
    let roomNumber = parseInt(req.params.n);
    if (isNaN(roomNumber)) {
        return res.status(406);
    }
    notifyLedController(roomNumberToLine(roomNumber));
    res.status(201).end();
});

router.get("/ideInfo", async (req, res, next) => {
    res.json(ideInfo);
});

export default router;
