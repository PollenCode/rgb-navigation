export type ArduinoBuildMessage =
    | { type: "stdout"; data: string }
    | { type: "stderr"; data: string }
    | { type: "status"; percent: number; status: string };

export type LedControllerServerMessage =
    | {
          type: "enableLine";
          duration: number;
          startLed: number;
          endLed: number;
          r: number;
          g: number;
          b: number;
      }
    | {
          type: "roomEffect";
          room: number;
      }
    | { type: "uploadProgram"; byteCode: string; entryPoint: number };

// !! Does your change here not reflect in other projects?
// Make sure to run `yarn start` in this folder (api) to build this package each time you change something
