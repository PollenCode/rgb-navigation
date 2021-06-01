import { IdeInfo } from "rgb-navigation-api";

// Contains documentation to show in online editor
export const ideInfo: IdeInfo = {
    functions: [
        {
            name: "sin",
            signature: "int sin(int value)",
            documentation: "Calculates sine of a value",
            parameters: [{ label: "int value", documentation: "0 is mapped to 0pi and 256 is mapped to 2pi" }],
        },
        {
            name: "cos",
            signature: "int cos(int value)",
            documentation: "Calculates cosine of a value",
            parameters: [{ label: "int value", documentation: "0 is mapped to 0pi and 256 is mapped to 2pi" }],
        },

        {
            name: "abs",
            signature: "int abs(int value)",
            documentation: "Calculates the absolute value of value",
            parameters: [{ label: "int value" }],
        },

        {
            name: "hsv",
            signature: "void hsv(byte h, byte s, byte v)",
            documentation: "Sets the r, g and b variables using the hsv colorspace",
            parameters: [
                { label: "h", documentation: "The colors hue (0 -> 255)" },
                { label: "s", documentation: "The colors saturation (0 -> 255)" },
                { label: "v", documentation: "The brightness of the color (0 -> 255)" },
            ],
        },

        {
            name: "map",
            signature: "int map(int value, int fromLow, int fromHigh, int toLow, int toHigh)",
            documentation:
                "Re-maps a number from one range to another. That is, a value of fromLow would get mapped to toLow, a value of fromHigh to toHigh, values in-between to values in-between, etc.",
            parameters: [
                { label: "value", documentation: "The number to map." },
                { label: "fromLow", documentation: "The lower bound of the value’s current range" },
                { label: "fromHigh", documentation: "The upper bound of the value’s current range" },
                { label: "toLow", documentation: "The lower bound of the value’s target range" },
                { label: "toHigh", documentation: "The upper bound of the value’s target range" },
            ],
        },
        {
            name: "max",
            signature: "int max(int value1, int value2)",
            documentation: "Returns the highest value of value1/value2",
            parameters: [{ label: "value1" }, { label: "value2" }],
        },
        {
            name: "min",
            signature: "int min(int value1, int value2)",
            documentation: "Returns the lowest value of value1/value2",
            parameters: [{ label: "value1" }, { label: "value2" }],
        },
        {
            name: "clamp",
            signature: "int clamp(int value, int min, int max)",
            documentation: "Limits value between min and max",
            parameters: [{ label: "value" }, { label: "min" }, { label: "max" }],
        },
        {
            name: "lerp",
            signature: "int lerp(int a, int b, int percentage)",
            documentation: "Goes from a to b, percentage (0 -> 256) determines which number between a and b to return",
            parameters: [
                { label: "a" },
                { label: "b" },
                {
                    label: "percentage",
                    documentation: "(0 -> 255), when 0 returns a, when 255 returns b, otherwise a number between a and b",
                },
            ],
        },
        {
            name: "random",
            signature: "byte random()",
            documentation: "Returns a random value between 0 -> 255",
            parameters: [],
        },
    ],
    variables: [
        { name: "index", documentation: "The number (index) of the current led" },
        { name: "timer", documentation: "Time in milliseconds since the program has started" },
        { name: "r", documentation: "The red value of the current led (the index-th led)" },
        { name: "g", documentation: "The green value of the current led (the index-th led)" },
        { name: "b", documentation: "The blue value of the current led (the index-th led)" },
        { name: "LED_COUNT", documentation: "The amount of leds in the ledstrip", readOnly: true },
    ],
};
