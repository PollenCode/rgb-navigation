import EventEmitter from "events";
import SerialPort from "serialport";

export enum SerialPacketType {
    EnableLine = 2,
    Program = 5,
    SetVar = 6,
}

export class SerialLedController {
    public port: SerialPort;

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

    public sendEnableLine(r: number, g: number, b: number, startLed: number, endLed: number, duration: number) {
        this.port.write(
            Buffer.from([
                SerialPacketType.EnableLine,
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

    public uploadProgram(program: Buffer, entryPoint: number) {
        let buffer = Buffer.alloc(program.length + 5);
        buffer.writeInt8(SerialPacketType.Program, 0);
        buffer.writeInt16BE(program.length, 1);
        buffer.writeInt16BE(entryPoint, 3);
        program.copy(buffer, 5, 0, program.length);
        this.port.write(buffer);
    }

    public sendSetVar(location: number, size: 1 | 4, value: number) {
        this.port.write(
            Buffer.from([
                SerialPacketType.SetVar,
                (location >> 8) & 0xff,
                location & 0xff,
                size,
                (value >> 24) & 0xff,
                (value >> 16) & 0xff,
                (value >> 8) & 0xff,
                value & 0xff,
            ])
        );
    }
}
