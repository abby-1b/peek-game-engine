import { Peek } from '../../peek';
import { FillRect } from './FillRect';

/** A screen button that can be pressed */
export class Button extends FillRect {
  /** Draws the button */
  public override innerDraw(width: number, height: number): void {
    Peek.ctx.strokeStyle = this.color.fillStyle();
    Peek.rect(0, 0, width, height);
  }
}

