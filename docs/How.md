# How does RGBLang work?

A basic compiler is built for RGBLang, which converts the text you enter into a syntax tree.

```
syntax tree here
```

When the compiler can't create a tree from your input, this is considered a syntax error.

When valid, it loops over the tree and performs type-checking. This procedure errors when you try to assign a constant variable, try to access a variable that doesn't exist, add things together that don't make sense etc.

The compiler code is located [here](https://github.com/PollenCode/rgb-navigation/tree/master/compiler/src)

After this, it will converted to be run on a specific platform, see below.

## Javascript (browser)

When using the [online editor](https://rgb.ikdoeict.be/), the tree gets transformed to javascript, which is then directly executed by your webbrowser. Check out the browser-simulation code [here](https://github.com/PollenCode/rgb-navigation/blob/master/client/src/simulate.ts) and [here](https://github.com/PollenCode/rgb-navigation/blob/cfb7f3411e8dccc1f14f745112ae5b5008cdae7f/client/src/pages/EffectEditor.tsx#L286).

### Example

```c
r = sin(timer / 10)
g = 0
b = 0
```

Gets converted into javascript:

```js
(mem, funcs)=>{mem.r=funcs.sin((mem.timer/10))&0xff;mem.g=0&0xff;mem.b=0&0xff;}
```

## Bytecode (ledstrip controller)

When uploading, the server compiles your code into _bytecode_. This is your code represented in bytes. This can then be understood by the ledstrip controller by looping over it. Look [here](https://github.com/PollenCode/rgb-navigation/blob/master/arduino/interpreter.c) to see how the controller interprets this bytecode.

### Example

```c
r = sin(timer / 10)
g = 0
b = 0
```

Gets converted into bytecode:

```txt
00000000000000000000000000000000010800030a1340080000030008010003000802000f (hex representation of bytecode)
```

Decompilation:

```
00000000000000000000000000000000    contains initialized variables
010800      push 8                  pushes integer at location 8 on the stack (timer variable)
030a        pushConst8 10           pushes constant 10 onto the stack
13          div                     pops 2 integers off the stack and pushes the division
40          sin                     pushes sine of popped value
080000      pop8 0                  pops top of stack to location 0 in memory (r variable)
0300        pushConst8 0            pushes constant 0
080100      pop8 1                  pops top of stack to location 1 in memory (g variable)
0300        pushConst8 0            pushes constant 0
080200      pop8 2                  pops top of stack to location 1 in memory (b variable)
0f          halt                    stops program execution
```
