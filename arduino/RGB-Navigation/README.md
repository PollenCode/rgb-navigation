# Serial communication protocol

Each data packet sent from the application to the arduino follows the following spec:

-   Each packet is minimum 4 bytes
-   First byte contains event type
-   Second byte contains

## Packet types

-   `[1, type]`: enable a special effect, with effect type specified by `type`.
-   `[2, id, r, g, b, start[2], end[2]]`: enable line named id, starting from led at index `start` and ending at led at index `end` with color `r`,`g`,`b`.
-   `[3, id]`: stops the line effect with set id.
