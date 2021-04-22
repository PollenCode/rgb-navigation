import SerialPort from "serialport";

function bufferToString(data: Buffer) {
    let str = "";
    for (let i = 0; i < data.length && data[i] != 0; i++) {
        str += String.fromCharCode(data[i]);
    }
    return str;
}

export enum SerialPacketType {
    Effect = 1,
    EnableLine = 2,
    DisableLine = 3,
    Room = 4,
}

export class SerialLedController {
    private port: SerialPort;

    constructor(serialPath: string, baudRate: number) {
        this.port = new SerialPort(serialPath, { baudRate: baudRate });
        this.port.on("error", this.errorHandler);
        this.port.on("data", this.dataHandler);
    }

    private errorHandler(error: any) {
        console.error("could not open serial port:", error);
    }

    private dataHandler(data: Buffer) {
        console.log("serial port:", bufferToString(data));
    }

    public send(buffer: Buffer) {
        this.port.write(buffer);
    }

    public sendEffect(effectType: number) {
        this.port.write(Buffer.from([3, SerialPacketType.Effect, effectType]));
    }

    public sendEnableLine(id: number, r: number, g: number, b: number, startLed: number, endLed: number, duration: number) {
        // console.log(`enable id=${id} startLed=${startLed} endLed=${endLed} duration=${duration}`);
        this.port.write(
            Buffer.from([
                12,
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
        this.port.write(Buffer.from([3, SerialPacketType.DisableLine, id]));
    }

    public sendRoom(id: number, room: number) {
        this.port.write(Buffer.from([4, SerialPacketType.Room, id, room]));
    }
}
