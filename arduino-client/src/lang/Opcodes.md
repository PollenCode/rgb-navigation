# Opcodes

-   `0x00` `noop`
-   `0x01` `push <src:2>`
-   `0x02` `pop <src:2>`
-   `0x03` `pushconst8 <c>`
-   `0x04` `pushconst16 <c:2>`
-   `0x05` `pushconst32 <c:4>`
-   `0x06` `pop`
-   `0x07` `swap`
-   `0x10` `add` +
-   `0x11` `sub` -
-   `0x12` `mul` \*
-   `0x13` `div` /
-   `0x14` `mod` %
-   `0x15` `inv` -
-   `0x16` `abs` abs()

```c
// pushconst8 5 (03 05)
// push 0 (01 00 00)
a = 8
// div
a = 5 / a
// pop 0 (02 00 00)


```
