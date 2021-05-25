# How does RGBLang work?

A basic compiler is built for RGBLang, which converts the text you enter into a syntax tree.

```
syntax tree here
```

When the compiler can't create a tree from your input, this is considered a syntax error.

When valid, it loops over the tree and performs type-checking. This procedure errors when you try to assign a constant variable, try to access a variable that doesn't exist, add things together that don't make sense etc.

The compiler code is located [here](https://github.com/PollenCode/rgb-navigation/tree/master/compiler/src)

## How does it work in the browser?

When using the [online editor](https://rgb.ikdoeict.be/), the tree gets transformed to javascript, which is then directly executed by your webbrowser. Check out the browser-simulation code [here](https://github.com/PollenCode/rgb-navigation/blob/master/client/src/simulate.ts) and [here](https://github.com/PollenCode/rgb-navigation/blob/cfb7f3411e8dccc1f14f745112ae5b5008cdae7f/client/src/pages/EffectEditor.tsx#L286).

### Example

```c
int a = sin(timer / 20);

hsv(a, 255, 255);
```

Gets converted into javascript:

```js
(mem, funcs) => {
    mem.a = funcs.sin(mem.timer / 20) & 0xffffffff;
    funcs.hsv(mem.a, 255, 255);
};
```

## How does it work on the leds?

When uploading, the server compiles it into _bytecode_. This is your code represented in bytes. This can then be understood by the ledstrip controller by looping over it. Look [here](https://github.com/PollenCode/rgb-navigation/blob/master/arduino/interpreter.c) to see how the controller interprets this bytecode.

### Example

```c
int a = sin(timer / 20);

hsv(a, 255, 255);
```

Gets converted into bytecode:

```txt
todo
```
