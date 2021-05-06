// Server -> Arduino
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

// Arduino -> Server
export type LedControllerMessage = {
    type: "data" | "error";
    data: string;
};

// !! Does your change here not reflect in other projects?
// Make sure to run `yarn start` in this folder (api) to build this package each time you change something
