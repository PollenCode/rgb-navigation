---
title: RGBLang
nav_order: 1
---

# RGBLang

RGBLang is the programming language that is used to create _shaders_ for the ledstrip, a shader is a program that runs for each led of the ledstrip.
This program gets uploaded to the ledstrip controller which executes it for each led (784 leds!) 60 timer per second.

This language does **not** support any loops (for, while).

**To see some example effects, look [here](https://pollencode.github.io/rgb-navigation/RGBLang.html)**

## The language

This section explains all of the available language features.

### Variables

Variables are like just any other programming language, a temporary location to store a value. Before assigning a value to a variable it must be declared.

```c
int a = 1000
byte b = 200
```

RGBLang currently only supports int and byte integer types. An integer can store 32 bit signed values (-2147483647 -> 2147483647) and a byte can store 8 bit unsigned values (0 -> 255)

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

### Functions

### Return/halt

## Advanced

### Static variables

Static variables are variables that keeps its value between different executions.

```c
// Do not assign a value immediately
int a;

// The value of a is persisted between runs if it wasn't assigned again
if (something) {
    a = 50;
}
```

## Simulation

Effects can be created on the [rgb.ikdoeict.be](https://rgb.ikdoeict.be/) website.
