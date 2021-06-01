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
    | { type: "uploadProgram"; byteCode: string; entryPoint: number }
    | { type: "setVar"; location: number; value: number; size: number };

// Arduino -> Server
export type LedControllerMessage = {
    type: "data" | "error";
    data: string;
};

export type IdeInfo = {
    functions: {
        name: string;
        signature: string;
        documentation?: string;
        parameters: { label: string; documentation?: string }[];
    }[];
    variables: {
        name: string;
        documentation?: string;
        readOnly?: boolean;
    }[];
};

// !! Does your change here not reflect in other projects?
// Make sure to run `yarn start` in this folder (api) to build this package each time you change something
