interface ScanMessage {}

export enum IdleLedEffect {
    Black = 0,
    Rainbow = 1,
}

export type LedControllerServerMessage =
    | {
          type: "setIdleEffect";
          effect: IdleLedEffect;
      }
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
    | {
          type: "customEffect";
          id: number;
      };

// !! Does your change here not reflect in other projects?
// Make sure to run `yarn start` in this folder (api) to build this package each time you change something
