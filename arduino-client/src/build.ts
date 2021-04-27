import { spawn } from "child_process";
import fsn from "fs";
import fs from "fs/promises";
import path from "path";

let arduinoProjectFolder = "arduino";
const command = `arduino-cli compile --upload -b arduino:avr:uno -p /dev/ttyUSB0 arduino`;

function getFileNameFor(name: string) {
    return name.replace(/[^a-z0-9]+/gi, "").toLowerCase() + ".h";
}

function getFunctionNameFor(name: string) {
    return name.replace(/[^a-z0-9]+/gi, "").toLowerCase() + "effect";
}

function generateEffectsHeaderScript(destination: string, effects: { name: string; code: string; id: number }[]) {
    let writeStream = fsn.createWriteStream(destination);

    writeStream.write("//\n");
    writeStream.write("// THIS FILE IS GENERATED USING arduino-client, DO NOT TOUCH IT!!\n");
    writeStream.write("//\n\n");

    writeStream.write("#pragma once\n");

    for (let i = 0; i < effects.length; i++) {
        let effect = effects[i];
        let effectFileName = getFileNameFor(effect.name);
        let effectFunctionName = getFunctionNameFor(effect.name);

        writeStream.write(`#define effect ${effectFunctionName}\n`);
        writeStream.write(`#include "effects/${effectFileName}"\n`);
    }

    writeStream.write("#undef effect\n\n");

    writeStream.write("void playEffect(unsigned char num) {\n");
    writeStream.write("\tswitch(num) {\n");
    for (let i = 1; i < effects.length; i++) {
        let effect = effects[i];
        let effectFunctionName = getFunctionNameFor(effect.name);

        if (i === 0) writeStream.write(`\tdefault:\n`);
        writeStream.write(`\tcase ${effect.id}:\n`);
        writeStream.write(`\t\t${effectFunctionName}();\n`);
        writeStream.write(`\t\treturn;\n`);
    }
    writeStream.write("\t}");
    writeStream.write("}");

    writeStream.close();
}

export async function createEffectScripts(destination: string, effects: { name: string; code: string }[]) {
    for (let i = 0; i < effects.length; i++) {
        let effect = effects[i];
        let fileName = getFileNameFor(effect.name);

        let fd = await fs.open(path.join(destination, fileName), "w");
        await fs.write(fd, effect.code);
        await fd.close();
    }
}

export async function createProject(destination: string, effects: { name: string; code: string; id: number }[]) {
    await fs.mkdir(path.join(destination, "effects"));
    await createEffectScripts(path.join(destination, "effects"), effects);
    await generateEffectsHeaderScript(path.join(destination, "effects.h"), effects);
}

export function build() {
    return new Promise((resolve, reject) => {
        let process = spawn("");

        process.on("exit", resolve);
    });
}
