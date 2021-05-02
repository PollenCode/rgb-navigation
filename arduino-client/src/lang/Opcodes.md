# Opcodes

-   `0x00`: noop (no operation)

-   `0x01 <dest> <value:1>`: add unsigned byte
-   `0x02 <dest> <value:2>`: add unsigned short
-   `0x03 <dest> <value:4>`: add unsigned int

-   `0x04 <dest> <value:1>`: sub unsigned byte
-   `0x05 <dest> <value:2>`: sub unsigned short
-   `0x06 <dest> <value:4>`: sub unsigned int

-   `0x07 <dest> <value:1>`: mul unsigned byte
-   `0x08 <dest> <value:2>`: mul unsigned short
-   `0x09 <dest> <value:4>`: mul unsigned int

-   `0x0A <dest> <value:1>`: div unsigned byte
-   `0x0B <dest> <value:2>`: div unsigned short
-   `0x0C <dest> <value:4>`: div unsigned int

-   `0x0D <dest> <value:1>`: mod unsigned byte
-   `0x0E <dest> <value:2>`: mod unsigned short
-   `0x0F <dest> <value:4>`: mod unsigned int

-   `0x31 <dest> <src> <value:1>`: add unsigned byte from src
-   `0x32 <dest> <src> <value:2>`: add unsigned short from src
-   `0x33 <dest> <src> <value:4>`: add unsigned int from src
