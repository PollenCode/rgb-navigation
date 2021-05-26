---
title: RGBLang
nav_order: 10
---

# RGBLang

RGBLang is the programming language that is used to create _shaders_ for the ledstrip, a shader is a program that runs for each led of the ledstrip.
This program gets uploaded to the ledstrip controller which executes it for each led (784 leds!) 60 timer per second.

**To see some example effects, look [here](https://pollencode.github.io/rgb-navigation/)**

## Features

This section explains all of the available language features.

### Variables

Variables are like just any other programming language, a temporary location to store a value. Before assigning a value to a variable it must be declared.

```c
int a = 1000
byte b = 200
```

RGBLang currently only supports **int** and **byte** integer types. An integer can store 32 bit signed values (-2147483647 -> 2147483647) and a byte can store 8 bit unsigned values (0 -> 255)

#### Builtin variables

RGBLang defines some builtin variables:

| Name          | Usage                                                                                                                                                                                                                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `r`, `g`, `b` | These magic variables contain the red green and blue color components of the current led the program is executing for (remember, your program gets executed for every led). You can set this to change the leds color or read its previous value. You can also set these using the [hsv utility function]() if you'd like to the hsv colorspace. |
| `index`       | This magic variable contains the index of the current led (the nth-led in the ledstrip). Its maximum value is defined by the `LED_COUNT` variable - 1                                                                                                                                                                                            |
| `timer`       | This magic variable increases constantly. It contains the amount of milliseconds since the program has started running.                                                                                                                                                                                                                          |
| `LED_COUNT`   | This constant variable contains the amount of leds in the ledstrip.                                                                                                                                                                                                                                                                              |

### If/else

To create conditional logic, RGBLang supports if statements. The code between its brackets only gets executed if its value is **non-zero**

```c
if something {
    // something was non-zero
}
```

If you also want to execute something if it isn't true, use the else statement

```c
if something {
    // something was non-zero
}
else {
    // something was zero
}
```

You can also nest and chain these if statements to create complex logic.

```c
// Yes, you don't have to place brackets () around something
if something {
    // ...
}
else if somethingElse {
    if somethingElseElse {
        // ...
    }
}
```

### Supported operators

The order of execution is respected, the upper-most rows are executed first.

| Operators       | Usage                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------ |
| \* / %          | Multiply, divide and modulus (division remainder)                                          |
| + -             | Add, substract                                                                             |
| == != >= <= > < | Comparison operators, these return either 0 or 1                                           |
| \|\| &&         | Or, and (these do [short circuit](https://en.wikipedia.org/wiki/Short-circuit_evaluation)) |
| ? :             | Ternary operator                                                                           |

### Functions

These builtin utility functions are available to you:

| Signature                                                              | Description                                                                                                                                                                    |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `int sin(int value)`                                                   | Calculates sine of a value. 0 is mapped to 0pi and 256 is mapped to 2pi                                                                                                        |
| `int cos(int value)`                                                   | Calculates cosine of a value. 0 is mapped to 0pi and 256 is mapped to 2pi                                                                                                      |
| `int abs(int value)`                                                   | Calculates the absolute value of value                                                                                                                                         |
| `byte random()`                                                        | Returns a random value between 0 -> 255                                                                                                                                        |
| `int max(int value1, int value2)`                                      | Returns the highest value of value1/value2                                                                                                                                     |
| `int min(int value1, int value2)`                                      | Returns the lowest value of value1/value2                                                                                                                                      |
| `void hsv(byte h, byte s, byte v)`                                     | Sets the r, g and b variables using the hsv colorspace. It does not return anything.                                                                                           |
| `int map(int value, int fromLow, int fromHigh, int toLow, int toHigh)` | Re-maps a number from one range to another. That is, a value of fromLow would get mapped to toLow, a value of fromHigh to toHigh, values in-between to values in-between, etc. |
| `int clamp(int value, int min, int max)`                               | Limits value between min and max                                                                                                                                               |
| `int lerp(int a, int b, int percentage)`                               | Goes from a to b, percentage (0 -> 256) determines which number between a and b to return                                                                                      |

Example function usage:

```c
// A will contain a random number that will be at least hunderd
byte a = max(random(), 100)
```

Currently, you can not create functions by yourself.

### Return/halt

To exit your program at any time, use the halt keyword. It behaves like the return keyword in other languages.

```c
if (something) {
    halt;
}
```

## Advanced

### Static variables

Static variables are variables that keep their value between different program executions.

```c
// Do not assign a value immediately
int a;

// The value of a is persisted between runs if it wasn't assigned again
if (something) {
    a = 50;
}
```

### Loops?

**No**

This language does not support any loops (for, while). Because your program will be executed in a loop (for every led), it is possible to create amazing effects without creating extra loops using the builtin index and timer variables.
