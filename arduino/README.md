## Serial communication protocol

Each data packet starts with 1 byte containing the packet type. From this packet type, the size of the packet can be determined.

**When modifying the serial protocol, make sure to update the [arduino-client](https://git.ikdoeict.be/stijn.rogiest/rgb-navigation/-/tree/master/arduino-client) project too, as this project implements this protcol.**

### Packet types

-   `[1, type]`: enable a special effect, with effect type specified by `type`.
-   `[2, id, r, g, b, start[2], end[2], duration[2]]`: enable line named id, starting from led at index `start` and ending at led at index `end` with color `r`,`g`,`b`.
-   `[3, id]`: stops the line effect with set id.
-   ~~`[4, roomId]`: enables a route to a certain room.~~
-   `[5, bytesToReceive[2], entryPoint[2]]`: receives rgblang bytecode. `bytesToReceive` contains the program size, entryPoint contains the address of the first instruction in memory to execute.
