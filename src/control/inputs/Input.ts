/* eslint-disable @typescript-eslint/no-explicit-any */

type GenericCallback = (...args: any[]) => void;

export const enum InputType {
  Position,
  Direction,
  Button
}

export const enum ButtonState {
  UNPRESSED = 0,
  PRESSED = 1,
}

/** Holds common code for all hardware inputs */
export class Input {
  private callbackCount = 0;

  /** A map from input type to callback, with controller ID */
  private callbacks: Map<InputType, Set<[ number, WeakRef<GenericCallback> ]>>
    = new Map();

  public pipe(
    inputType: InputType.Position,
    fn: (x: number, y: number) => void,
    controllerID: number
  ): void;
  public pipe(
    inputType: InputType.Direction,
    fn: (x: number, y: number) => void,
    controllerID: number
  ): void;
  public pipe(
    inputType: InputType.Button,
    fn: (button: string, state: number) => void,
    controllerID: number
  ): void;

  /** Pipes input from the selected input to the given function */
  public pipe(inputType: InputType, fn: GenericCallback, controllerID: number) {
    const tuple: [ number, WeakRef<GenericCallback> ] = [
      controllerID,
      new WeakRef(fn)
    ];
    if (this.callbacks.has(inputType)) {
      this.callbacks.get(inputType)!.add(tuple);
    } else {
      this.callbacks.set(inputType, new Set([ tuple ]));
    }

    // Initialize
    if (this.callbackCount == 0) {
      this.onInitialize();
    }
    this.callbackCount++;
  }

  /** Removes a controller, stopping all its callbacks */
  public removeController(controllerID: number) {
    // Delete callbacks with this specific controller ID
    for (const kvPair of this.callbacks) {
      const set = kvPair[1];
      for (const callback of set) {
        if (callback[0] != controllerID) continue;
        this.callbackCount--;
        set.delete(callback);
      }
    }

    // Destroy
    if (this.callbackCount == 0) {
      this.onDestroy();
    }
  }

  protected out(
    inputType: InputType.Position, x: number, y: number
  ): void;
  protected out(
    inputType: InputType.Direction, x: number, y: number
  ): void;
  protected out(
    inputType: InputType.Button, data: string, state: number
  ): void;

  /** Called by the child class when there's an input to handle */
  protected out(inputType: InputType, ...data: any[]) {
    for (const callback of this.callbacks.get(inputType)!) {
      callback[1].deref()?.(...data);
    }
  }

  /** Called when an input is attached to this class */
  protected onInitialize() {}

  /** Called when this input type is no longer needed */
  protected onDestroy() {}
}
