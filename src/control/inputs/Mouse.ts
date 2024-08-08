/* eslint-disable @typescript-eslint/no-explicit-any */
import { Peek } from '../../peek';
import { ButtonState, Input, InputType } from './Input';

export const enum MouseButton {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2,
  FOURTH = 3,
  FIFTH = 4,
}

/** Handles all mouse inputs */
class MouseInput extends Input {
  private positionListener?: (e: MouseEvent) => void;
  private downListener?: (e: MouseEvent) => void;
  private upListener?: (e: MouseEvent) => void;

  /** Called when an input is attached to this class */
  protected override onInitialize() {
    // TODO: add debugger support (check if mouse is available)
    this.positionListener = e => {
      const x = Peek.screenWidth  * (e.clientX / window.innerWidth );
      const y = Peek.screenHeight * (e.clientY / window.innerHeight);
      this.out(InputType.Position, x, y);
    };
    this.downListener = e => {
      this.out(InputType.Button, e.button, ButtonState.PRESSED);
    };
    this.upListener = e => {
      this.out(InputType.Button, e.button, ButtonState.UNPRESSED);
    };

    window.addEventListener('mousemove', this.positionListener);
    window.addEventListener('mousedown', this.downListener);
    window.addEventListener('mouseup', this.upListener);
  }

  /** Called when this input type is no longer needed */
  protected override onDestroy() {
    window.removeEventListener('mousemove', this.positionListener!);
    window.removeEventListener('mousedown', this.downListener!);
    window.removeEventListener('mouseup', this.upListener!);
    this.positionListener = undefined;
    this.downListener = undefined;
    this.upListener = undefined;
  }
}
export const Mouse = new MouseInput();
