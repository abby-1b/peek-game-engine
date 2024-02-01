import { Module } from '../Module.ts';
import { Frame } from './Frame.ts';

/**
 * Takes care of all the input devices
 */
export class Control extends Module {
  public static mouseDown = false;
  public static mouseX = 0;
  public static mouseY = 0;

  static {
    window.addEventListener('pointerdown', () => {
      this.mouseDown = true;
    });
    window.addEventListener('pointerup', () => {
      this.mouseDown = false;
    });
    window.addEventListener('pointermove', e => {
      this.mouseX = e.clientX / window.innerWidth  * Frame.width;
      this.mouseY = e.clientY / window.innerHeight * Frame.height;
    });
  }

  /** Runs a function when a key is pressed! */
  public static onKeyDown(k: string, fn: () => void) {
    window.addEventListener('keydown', (event => {
      if (event.key == k) fn();
    }));
  }

  /**
   * Runs a function when the mouse (or pointer) is pressed then released
   */
  public static onMouseClick(
    fn: (button: number, mouseX: number, mouseY: number) => void
  ) {
    window.addEventListener('pointerdown', e => {
      fn(e.button, this.mouseX, this.mouseY);
    });
  }
}
