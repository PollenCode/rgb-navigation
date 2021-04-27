import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

function getFileNameFor(name: string) {
    return name.replace(/[^a-z0-9]+/gi, "").toLowerCase() + ".h";
}

function getFunctionNameFor(name: string) {
    return name.replace(/[^a-z0-9]+/gi, "").toLowerCase() + "effect";
}

async function generateEffectsHeaderScript(destination: string, effects: { name: string; code: string; id: number }[]) {
    let writeStream = await fs.open(destination, "w");
    await writeStream.write("//\n");
    await writeStream.write("// THIS FILE IS GENERATED USING arduino-client, DO NOT TOUCH IT!!\n");
    await writeStream.write("//\n\n");

    await writeStream.write("#pragma once\n");

    for (let i = 0; i < effects.length; i++) {
        let effect = effects[i];
        let effectFileName = getFileNameFor(effect.name);
        let effectFunctionName = getFunctionNameFor(effect.name);

        await writeStream.write(`#define effect ${effectFunctionName}\n`);
        await writeStream.write(`#include "effects/${effectFileName}"\n`);
    }

    await writeStream.write("#undef effect\n\n");

    await writeStream.write("void playEffect(unsigned char num) {\n");
    await writeStream.write("\tswitch(num) {\n");
    for (let i = 0; i < effects.length; i++) {
        let effect = effects[i];
        let effectFunctionName = getFunctionNameFor(effect.name);

        if (i === 0) await writeStream.write(`\tdefault:\n`);
        await writeStream.write(`\tcase ${effect.id}:\n`);
        await writeStream.write(`\t\t${effectFunctionName}();\n`);
        await writeStream.write(`\t\treturn;\n`);
    }
    await writeStream.write("\t}");
    await writeStream.write("}");

    await writeStream.close();
}

export async function createEffectScripts(destination: string, effects: { name: string; code: string }[]) {
    for (let i = 0; i < effects.length; i++) {
        let effect = effects[i];
        let fileName = getFileNameFor(effect.name);

        let fd = await fs.open(path.join(destination, fileName), "w");
        await fd.write(effect.code);
        await fd.close();
    }
}

export async function createProject(destination: string, effects: { name: string; code: string; id: number }[]) {
    await fs.mkdir(path.join(destination, "effects"), { recursive: true });

    const TEMPLATE_FOLDER = "../arduino";
    await fs.copyFile(path.join(TEMPLATE_FOLDER, "arduino.ino"), path.join(destination, path.basename(destination) + ".ino"));
    await fs.copyFile(path.join(TEMPLATE_FOLDER, "leds.h"), path.join(destination, "leds.h"));

    await createEffectScripts(path.join(destination, "effects"), effects);
    await generateEffectsHeaderScript(path.join(destination, "effects.h"), effects);
}

export function buildProject(destination: string): Promise<void> {
    return new Promise((resolve, reject) => {
        let process = spawn(`/usr/local/bin/arduino-cli`, ["compile", "--upload", "-b", "arduino:avr:uno", "-p", "/dev/ttyUSB0", destination]);

        process.stdout.on("data", (data) => {
            console.log("| " + data);
        });

        process.stderr.on("data", (data) => {
            console.log("! " + data);
        });

        process.on("exit", (code) => {
            console.log("process exited", code);
            resolve();
        });
    });
}
