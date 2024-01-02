import { Frame } from '../../modules/Frame.ts';
import { Node2D } from '../Node2D.ts';

/** Moves the camera around! */
export class Camera extends Node2D {
  private shakeAmount = 0;
  /**  */
  public shake(amount: number, add = false) {
    if (add) {
      this.shakeAmount += this.shakeAmount;
    } else {
      this.shakeAmount = Math.max(amount, this.shakeAmount);
    }
  }

  /** Does the camera transform */
  public doTransform() {
    Frame.translate(
      ~~(
        -(this.position.x - Frame.width / 2)
        + Math.random() * this.shakeAmount
      ),
      ~~(
        -(this.position.y - Frame.height/ 2)
        + Math.random() * this.shakeAmount
      ),
    );
    this.shakeAmount *= 0.9;
  }
}
