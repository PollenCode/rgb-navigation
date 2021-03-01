require("dotenv").config();
import pcscCreator from "pcsclite";
import WebSocket from "ws";

if (!process.env.URL) {
    console.error("Please create an .env file and restart the server. (You should copy the .env.example file)");
    process.exit(-1);
}

let socket: WebSocket | null = null;

function connect() {
    console.log("connecting...");
    socket = new WebSocket(process.env.URL!);
    socket.on("open", () => {
        console.log("connection established");
    });
    socket.on("close", () => {
        console.log("connection closed");
        // Try to reconnect...
        setTimeout(connect, 5000);
    });
}

const pcsc = pcscCreator();

pcsc.on("reader", function (reader) {
    console.log(`reader detected: ${reader.name}`);

    reader.on("error", function (err) {
        console.log(`card reader error ${this.name}: ${err.message}`);
    });

    reader.on("status", function (status) {
        var changes = this.state ^ status.state;
        if (!changes) return;
        if (changes & this.SCARD_STATE_EMPTY && status.state & this.SCARD_STATE_EMPTY) {
            console.log("card got removed");
            reader.disconnect(reader.SCARD_LEAVE_CARD, function (err) {
                if (err) return console.error("problem while disconnecting card", err);
                console.log("disconnected");
            });
        } else if (changes & this.SCARD_STATE_PRESENT && status.state & this.SCARD_STATE_PRESENT) {
            console.log("card got inserted");

            reader.connect({ share_mode: this.SCARD_SHARE_SHARED }, function (err, protocol) {
                if (err) return console.error("could not connect to card", err);

                // Send apdu command to get unique identifier (https://en.wikipedia.org/wiki/Smart_card_application_protocol_data_unit)
                // let cmd = [0x00, 0xb0, 0x00, 0x00, 0x20];
                let cmd = [0xff, 0xca, 0x00, 0x00, 0x00];
                reader.transmit(Buffer.from(cmd), cmd.length * 8, protocol, function (err, data) {
                    // https://web.archive.org/web/20090623030155/http://cheef.ru/docs/HowTo/SW1SW2.info
                    if (err) return console.error("could not get uid", err);
                    if (data.length <= 2) return console.error("invalid data received from card");
                    console.log("uid received", data);

                    // Send to server
                    if (connectedSocket && connectedSocket.readyState === WebSocket.OPEN) connectedSocket.send(JSON.stringify({ uid: data }));
                });
            });
        }
    });

    reader.on("end", function () {
        console.log(`reader removed: ${reader.name}`);
    });
});

pcsc.on("error", function (err) {
    console.error("error", err.message);
});

connect();
