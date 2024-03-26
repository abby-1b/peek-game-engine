import { lerp, nerp, qerp, randomRange } from '../util/math';

/** A 2D Vector */
export class Vec2 {
  /** Constructs a vector (0, 0) */
  public static zero(): Vec2 {
    return new Vec2(0, 0);
  }

  /** Constructs a 2D Vector */
  public constructor(public x: number, public y: number) {}

  // TODO: implement vector methods

  // SETTING

  /** Sets the values of this vector to the passed values */
  public set(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  /** Copies the values of another vector into this one */
  public setVec(v: Vec2) {
    this.x = v.x;
    this.y = v.y;
  }

  /** Spreads this vector in a radius around a position */
  public spread(x: number, y: number, radius: number) {
    // Get a random point on the unit circle
    let nx = -1;
    let ny = -1;
    while (nx ** 2 + ny ** 2 > 1) {
      nx = randomRange(-1, 1);
      ny = randomRange(-1, 1);
    }

    // Transform it for our purposes
    this.x = x + nx * radius;
    this.y = y + ny * radius;
  }
  /** Spreads this vector in a radius around another vector */
  public spreadVec(v: Vec2, radius: number) {
    return this.spread(v.x, v.y, radius);
  }

  /** Spreads this vector in a range of radiuses around a position */
  public spreadRange(
    x: number,
    y: number,
    rangeNear: number,
    rangeFar: number
  ) {
    // Get the inner radius in the unit circle (squared)
    const innerUnitSq = (rangeNear / rangeFar) ** 2;

    // Get a random point on the unit circle
    let nx = -1;
    let ny = -1;
    while (nx ** 2 + ny ** 2 > 1 || nx ** 2 + ny ** 2 < innerUnitSq) {
      nx = randomRange(-1, 1);
      ny = randomRange(-1, 1);
    }

    // Transform it for our purposes
    this.x = x + nx * rangeFar;
    this.y = y + ny * rangeFar;
  }
  /** Spreads this vector in a range of radiuses around a vector */
  public spreadRangeVec(v: Vec2, rangeNear: number, rangeFar: number) {
    return this.spreadRange(v.x, v.y, rangeNear, rangeFar);
  }

  // INTERPOLATION

  /** Linearly interpolates to an XY position by a given amount */
  public lerp(x: number, y: number, i: number) {
    this.x = lerp(this.x, x, i);
    this.y = lerp(this.y, y, i);
  }
  
  /** Linearly interpolates to a vector by a given amount */
  public lerpVec(v: Vec2, i: number) {
    this.x = lerp(this.x, v.x, i);
    this.y = lerp(this.y, v.y, i);
  }
  
  /** Quadratically interpolates to an XY position by a given amount */
  public qerp(x: number, y: number, i: number) {
    this.x = qerp(this.x, x, i);
    this.y = qerp(this.y, y, i);
  }
  
  /** Quadratically interpolates to a vector by a given amount */
  public qerpVec(v: Vec2, i: number) {
    this.x = qerp(this.x, v.x, i);
    this.y = qerp(this.y, v.y, i);
  }
  
  /** N-power interpolates to an XY position by a given amount */
  public nerp(x: number, y: number, i: number, n: number) {
    this.x = nerp(this.x, x, i, n);
    this.y = nerp(this.y, y, i, n);
  }
  
  /** N-power interpolates to a vector by a given amount */
  public nerpVec(v: Vec2, i: number, n: number) {
    this.x = nerp(this.x, v.x, i, n);
    this.y = nerp(this.y, v.y, i, n);
  }
}
