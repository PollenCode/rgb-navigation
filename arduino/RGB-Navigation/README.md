# Serial communication protocol

Each data packet sent from the application to the arduino follows the following spec:

-   The first byte contains the amount of bytes following this byte + 1
-   Second byte contains the packet type

## Packet types

-   `[3, 1, type]`: enable a special effect, with effect type specified by `type`.
-   `[12, 2, id, r, g, b, start[2], end[2], duration[2]]`: enable line named id, starting from led at index `start` and ending at led at index `end` with color `r`,`g`,`b`.
-   `[3, 3, id]`: stops the line effect with set id.
