---
title: RGBLang
nav_order: 1
---

# RGBLang

RGBLang is the programming language that is used to create _shaders_ for the ledstrip, a shader is a program that runs for each led of the ledstrip.
This program gets uploaded to the ledstrip controller which executes it for each led (784 leds!) 60 timer per second.

This language does **not** support any loops (for, while) because it enforces a functional programming style. 

## Basic examples

### Solid color

The following program sets every led on the ledstrip to a bright red.

```c
// This will be executed for each led
r = 255
g = 0
b = 0
```
The `r`, `g` and `b` variables contain the red green and blue values for the current led on the led strip. You can read and write these.
These variables are bytes, this means they have a minumim value of 0 and a maximum value of 255.

### Gradient

To create more complex effects, you can use the `index` variable, which contains the index of the led on the ledstrip for which the program is currently executing.

```c
// index can be 0 - 784 if your ledstrip contains 784 leds
r = 0
g = index / 3 // Divide by 3 to match 255 as max green value
b = 0
```

This code shows a gradient from black to green.

### Moving animation

To create moving animations, you should use the builtin `timer` variable. This variable contains the amount of milliseconds since the program has started running.

```c
r = 0
g = 0
// Limit timer to 0 - 255 using modulus
b = timer % 255
```

This will show a flashing blue color. This is a rather sudden transition, it is better to use the builtin `sin()` function to create a smooth transition from blue to black:

```
r = 0
g = 0
b = sin(timer)
```
You can also use the `cos()` function, look [here]() for a list of builtin utility functions.


### Combine timer and index

You can combine the `index` and `timer` variables to create epic 😎 animations. 

This animation shows a moving red wave:
```c
// index contains n-th led, timer increases each frame
r = sin(index * 10 + timer / 10)
g = 0
b = 0
```
This animation moves a single red dot from the start of the ledstrip to the end:

```c
b = 0
g = 0
if (index == (timer / 50) % 30) {
    // Create dot
    r = 255
}
else  {
    // Trail effect
    // r - 10 can be negative, which will cause problems
    // use the max function to ensure it it at least 0
    r = max(r - 10, 0)
}
```


