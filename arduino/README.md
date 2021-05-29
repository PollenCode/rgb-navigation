## Serial communication protocol

Each data packet starts with 1 byte containing the packet type. From this packet type, the size of the packet can be determined.

**When modifying the serial protocol, make sure to update the [arduino-client](https://git.ikdoeict.be/stijn.rogiest/rgb-navigation/-/tree/master/arduino-client) project too, as this project implements this protcol.**

### Packet types

-   `[2, r, g, b, start[2], end[2], duration[2]]`: enable route starting from led at index `start` and ending at led at index `end` with color `r`,`g`,`b`.
-   `[5, bytesToReceive[2], entryPoint[2]]`: receives rgblang bytecode. `bytesToReceive` contains the program size, entryPoint contains the address of the first instruction in memory to execute.
-   `[6, location[2], size, value[4]]`: sets variable in effect memory
