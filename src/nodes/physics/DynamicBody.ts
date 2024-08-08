import { Vec2 } from '../../resources/Vec';
import { StaticBody } from './StaticBody';

/** A physics body that moves! */
export class DynamicBody extends StaticBody {
  public velocity: Vec2 = Vec2.zero();

  /**
   * The change in acceleration of this body.
   * To apply motion, do `Body.acceleration.set(x, y)`.
   */
  public acceleration: Vec2 = Vec2.zero();

  /** The base friction applied to all *NEW* DynamicBody nodes. */
  public static baseFriction = 0.5;

  /** The friction coefficient, initialized when the node is created. */
  public friction = DynamicBody.baseFriction;

  // // Used for calculating physics...
  // public newPosChange: Vec2 = Vec2.zero();
  // public newVelChange: Vec2 = Vec2.zero();

  /**
   * Deals with the dynamic body's physics. When overriding the process method,
   * make sure to call `super.process()` if you want physics to work!
   */
  protected override process(delta: number): void {
    this.velocity.subVec(
      this.velocity.mulScalarRet(1 - 0.5 ** (this.friction * delta))
    );
    this.velocity.addVec(this.acceleration.mulScalarRet(0.5 * delta));

    this.pos.addVec(this.velocity.mulScalarRet(delta));
    // this.pos.addVec(this.acceleration.mulScalarRet(0.5 * delta ** 2));
    
    this.velocity.subVec(
      this.velocity.mulScalarRet(1 - 0.5 ** (this.friction * delta))
    );
    this.velocity.addVec(this.acceleration.mulScalarRet(0.5 * delta));
  }

  /** Sets this body's acceleration. Use this, never add to the speed! */
  public setAccelVec(acceleration: Vec2): void {
    this.acceleration.setVec(acceleration);
  }
}
