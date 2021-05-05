import SerialPort from "serialport";

export enum SerialPacketType {
    Effect = 1,
    EnableLine = 2,
    DisableLine = 3,
    Room = 4,
    Program = 5,
}

export class SerialLedController {
    private port: SerialPort;

    public async pause() {
        await new Promise((res) => this.port.close(res));
    }

    public resume() {
        this.port = new SerialPort(this.port.path, { baudRate: this.port.baudRate });
        this.port.on("error", this.errorHandler);
        this.port.on("data", this.dataHandler);
    }

    constructor(serialPath: string, baudRate: number) {
        this.port = new SerialPort(serialPath, { baudRate: baudRate });
        this.port.on("error", this.errorHandler);
        this.port.on("data", this.dataHandler);
    }

    private errorHandler(error: any) {
        console.error("could not open serial port:", error);
    }

    private dataHandler(data: Buffer) {
        process.stdout.write(data.toString("utf-8"));
    }

    public send(buffer: Buffer) {
        this.port.write(buffer);
    }

    public sendEffect(effectType: number) {
        this.port.write(Buffer.from([SerialPacketType.Effect, effectType]));
    }

    public sendEnableLine(id: number, r: number, g: number, b: number, startLed: number, endLed: number, duration: number) {
        // console.log(`enable id=${id} startLed=${startLed} endLed=${endLed} duration=${duration}`);
        this.port.write(
            Buffer.from([
                SerialPacketType.EnableLine,
                id,
                r,
                g,
                b,
                (startLed >> 8) & 0xff,
                startLed & 0xff,
                (endLed >> 8) & 0xff,
                endLed & 0xff,
                (duration >> 8) & 0xff,
                duration & 0xff,
            ])
        );
    }

    public sendDisableLine(id: number) {
        // console.log(`disable id=${id}`);
        this.port.write(Buffer.from([SerialPacketType.DisableLine, id]));
    }

    public sendRoom(id: number, room: number) {
        this.port.write(Buffer.from([SerialPacketType.Room, id, room]));
    }

    public sendProgram(program: Buffer, entryPoint: number) {
        let buffer = Buffer.alloc(program.length + 5);
        buffer.writeInt8(SerialPacketType.Program, 0);
        buffer.writeInt16BE(program.length, 1);
        buffer.writeInt16BE(entryPoint, 3);
        program.copy(buffer, 5, 0, program.length);
        this.port.write(buffer);
    }
}
