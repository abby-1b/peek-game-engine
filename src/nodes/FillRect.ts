import { Peek } from '../peek';
import { Color } from '../resources/Color';
import { PNode } from './PNode';

/** A rectangle filled with a single color. */
export class FillRect extends PNode {
  public color: Color;

  /** Initializes a FillRect */
  public constructor(color: Color = Color.WHITE) {
    super();
    this.color = color;
  }

  /** Draws this FillRect */
  protected draw() {
    // TODO: draw the FillRect properly
    Peek.ctx.fillStyle = this.color.fillStyle();
    Peek.ctx.fillRect(0, 0, Peek.screenWidth, Peek.screenHeight);
  }
}