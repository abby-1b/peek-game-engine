import { Peek } from '../../peek';
import { Color } from '../../resources/Color';
import { ControlNode } from './ControlNode';

/** A rectangle filled with a single color */
export class FillRect extends ControlNode {
  public color = Color.WHITE;

  /** Sets the color of this rect */
  public setColor(color: Color): this {
    this.color = color;
    return this;
  }

  /** Draws this FillRect */
  protected innerDraw(width: number, height: number) {
    Peek.fillRect(0, 0, width, height, this.color);
  }
}
