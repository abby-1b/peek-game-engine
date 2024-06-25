/* eslint-disable @typescript-eslint/no-explicit-any */
import { Peek } from '../../peek';
import { Input, InputType } from './Input';

export const enum MouseButton {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2,
  FOURTH = 3,
  FIFTH = 4,
}

/** Handles all mouse inputs */
class MouseInput extends Input {
  private positionListener!: (e: MouseEvent) => void;

  /** Called when an input is attached to this class */
  protected onInitialize() {
    // TODO: add debugger support (check if mouse is available)
    this.positionListener = (e: MouseEvent) => {
      const x = Peek.screenWidth  * (e.clientX / window.innerWidth );
      const y = Peek.screenHeight * (e.clientY / window.innerHeight);
      this.out(InputType.Position, x, y);
    };
    window.addEventListener('mousemove', this.positionListener);
  }

  /** Called when this input type is no longer needed */
  protected onDestroy() {
    window.removeEventListener('mousemove', this.positionListener);
    (this.positionListener as any) = undefined;
  }
}
export const Mouse = new MouseInput();
