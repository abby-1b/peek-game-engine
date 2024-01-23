import { Control } from '../../../modules/Control.ts';
import { FillRect } from '../FillRect.ts';

type ButtonAction = () => void;

/** Makes a button appear on the screen */
export class ButtonNode extends FillRect {
  private static isListenerImplemented = false;

  /** Implements the  */
  private static implementListener() {
    if (isListenerImplemented) return;
  }
  constructor() {

  }

  public actions: ButtonAction[] = [];

  /** Runs an action when the button is pressed */
  public addAction(action: ButtonAction) {
    this.actions.push(action);
  }

  /** Checks if a specified XY position intersects with this button. */
  public positionHits(x: number, y: number) {
    // TODO: 
  }
}
