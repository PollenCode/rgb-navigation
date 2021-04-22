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
