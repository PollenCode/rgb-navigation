export function beginRenderLeds(canvas: HTMLCanvasElement) {
    let graphics = canvas.getContext("2d")!;
    let leds = new Array(canvas.width).fill([0, 0, 0]);
    let memory = {
        r: 0,
        g: 0,
        b: 0,
        timer: 0,
        index: 0,
    };
    let funcs = {
        sin: (e: number) => Math.sin((e / 128.0) * 3.14) * 128 + 128,
        cos: (e: number) => Math.cos((e / 128.0) * 3.14) * 128 + 128,
        random: () => Math.floor(Math.random() * 256),
        out: (e: any) => console.log(e),
        min: (n1: number, n2: number) => (n1 > n2 ? n2 : n1),
        max: (n1: number, n2: number) => (n1 < n2 ? n2 : n1),
        map: (x: number, fromMin: number, fromMax: number, toMin: number, toMax: number) =>
            ((x - fromMin) * (toMax - toMin)) / (fromMax - fromMin) + toMin,
        lerp: (from: number, to: number, percentage: number) => from + (percentage / 256.0) * (to - from),
        clamp: (value: number, min: number, max: number) => (value > max ? max : value < min ? min : value),
        hsv: (h: number, s: number, v: number) => {
            [memory.r, memory.g, memory.b] = hsv2rgb(h, s, v);
        },
    };

    function renderLeds() {
        if ((window as any).runLeds) {
            memory.timer = new Date().getTime();
            for (let i = 0; i < leds.length; i++) {
                memory.index = i;

                // The run function is placed on the global window
                // The run function is the javascript compiled version of rgblang
                [memory.r, memory.g, memory.b] = leds[i];
                (window as any).runLeds(memory, funcs);
                leds[i] = [memory.r, memory.g, memory.b];

                graphics.fillStyle = `rgb(${memory.r},${memory.g},${memory.b})`;
                graphics.fillRect(i * 1, 0, 1, 10);
            }
        }

        window.requestAnimationFrame(renderLeds);
    }

    console.log("begin rendering");
    window.requestAnimationFrame(renderLeds);
}

export function hsv2rgb(h: number, s: number, v: number) {
    h = (h / 256) * 360;
    s /= 256;
    v /= 256;
    // Thx https://stackoverflow.com/a/54024653/11193005
    let f = (n: number, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
    return [f(5) * 255, f(3) * 255, f(1) * 255];
}
