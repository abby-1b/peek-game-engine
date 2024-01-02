import { Frame } from '../../modules/Frame.ts';
import { Node2D } from '../Node2D.ts';
import { Vec2 } from '../vector.ts';

/** Draws a filled rectangle to the screen */
export class FillRect extends Node2D {
  public size: Vec2;
  public color: [number, number, number, number] = [ 1, 0, 0, 1 ];

  /** Initializes the rectangle */
  public constructor(size: Vec2) {
    super();
    this.size = size;
  }

  /** Runs every frame */
  public frame() {
    Frame.color(...this.color);
    Frame.rect(0, 0, this.size.x, this.size.y);
  }
}
