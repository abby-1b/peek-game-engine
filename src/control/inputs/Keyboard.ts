/* eslint-disable @typescript-eslint/no-explicit-any */
import { ButtonState, Input, InputType } from './Input';

/** Handles all keyboard inputs */
export class KeyboardInput extends Input {
  private downListener!: (e: KeyboardEvent) => void;
  private upListener!: (e: KeyboardEvent) => void;

  /** Called when an input is attached to this class */
  protected onInitialize() {
    // TODO: add debugger support (check if keyboard is available)
    this.downListener = (e: KeyboardEvent) => {
      this.out(
        InputType.Button,
        e.key,
        ButtonState.PRESSED
      );
    };
    this.upListener = (e: KeyboardEvent) => {
      this.out(
        InputType.Button,
        e.key,
        ButtonState.UNPRESSED
      );
    };
    window.addEventListener('keydown', this.downListener);
    window.addEventListener('keyup', this.upListener);
  }

  /** Called when this input type is no longer needed */
  protected onDestroy() {
    console.log('keyboard destroyed!');
    window.removeEventListener('keydown', this.downListener);
    window.removeEventListener('keyup', this.upListener);
    (this.downListener as any) = undefined;
    (this.upListener as any) = undefined;
  }
}
export const Keyboard = new KeyboardInput();
