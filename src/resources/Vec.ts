import { lerp, nerp, qerp, randomRange } from '../util/math';

/** A 2D Vector */
export class Vec2 {
  /** Constructs a vector (0, 0) */
  public static zero(): Vec2 {
    return new Vec2(0, 0);
  }

  /** Constructs a 2D Vector */
  public constructor(public x: number, public y: number) {}


  // VECTOR MATH

  /** Adds the values of another vector to this one */
  public add(x: number, y: number) {
    this.x += x;
    this.y += y;
  }

  /** Adds the values of another vector to this one */
  public addVec(v: Vec2) {
    this.x += v.x;
    this.y += v.y;
  }
  
  /** Adds the values of another vector to this one */
  public sub(x: number, y: number) {
    this.x -= x;
    this.y -= y;
  }

  /** Adds the values of another vector to this one */
  public subVec(v: Vec2) {
    this.x -= v.x;
    this.y -= v.y;
  }

  /** Multiplies this vector by a scalar value */
  public mul(x: number, y: number) {
    this.x *= x;
    this.y *= y;
  }

  /** Multiplies this vector by another vector (component-wise) */
  public mulVec(v: Vec2) {
    this.x *= v.x;
    this.y *= v.y;
  }

  /** Multiplies this vector by a scalar value */
  public mulScalar(scalar: number) {
    this.x *= scalar;
    this.y *= scalar;
  }

  /** Divides this vector by a scalar value */
  public div(x: number, y: number): void {
    this.x /= x;
    this.y /= y;
  }

  /** Divides this vector by another vector (component-wise) */
  public divVec(v: Vec2): void {
    this.x /= v.x;
    this.y /= v.y;
  }

  /** Divides this vector by a scalar value */
  public divScalar(scalar: number) {
    this.x /= scalar;
    this.y /= scalar;
  }

  /** Adds the values of another vector to this one and returns */
  public addRet(x: number, y: number): Vec2 {
    return new Vec2(this.x + x, this.y + y);
  }

  /** Adds the values of another vector to this one and returns */
  public addVecRet(v: Vec2): Vec2 {
    return new Vec2(this.x + v.x, this.y + v.y);
  }

  /** Subtracts the values of another vector from this one and returns */
  public subRet(x: number, y: number): Vec2 {
    return new Vec2(this.x - x, this.y - y);
  }

  /** Subtracts the values of another vector from this one and returns */
  public subVecRet(v: Vec2): Vec2 {
    return new Vec2(this.x - v.x, this.y - v.y);
  }

  /** Multiplies this vector by a scalar value and returns */
  public mulRet(x: number, y: number): Vec2 {
    return new Vec2(this.x * x, this.y * y);
  }

  /** Multiplies this vector by another vector and returns */
  public mulVecRet(v: Vec2): Vec2 {
    return new Vec2(this.x * v.x, this.y * v.y);
  }

  /** Multiplies this vector by a scalar value and returns */
  public mulScalarRet(scalar: number): Vec2 {
    return new Vec2(this.x * scalar, this.y * scalar);
  }

  /** Divides this vector by a scalar value and returns */
  public divRet(x: number, y: number): Vec2 {
    return new Vec2(this.x / x, this.y / y);
  }

  /** Divides this vector by another vector and returns */
  public divVecRet(v: Vec2): Vec2 {
    return new Vec2(this.x / v.x, this.y / v.y);
  }

  /** Divides this vector by a scalar value and returns */
  public divScalarRet(scalar: number): Vec2 {
    return new Vec2(this.x / scalar, this.y / scalar);
  }


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

  /**
   * Normalizes this vector to be of length 1
   * If the vector is (0, 0), it remains at (0, 0)
   */
  public normalize() {
    const len = Math.hypot(this.x, this.y);
    if (len == 0) return;
    this.x /= len;
    this.y /= len;
  }

  /** Rounds the X and Y components (to the nearest integer) */
  public round() {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
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

  // FETCHING

  /** Gets the length of this vector */
  public length() {
    return Math.hypot(this.x, this.y);
  }

  /**
   * Normalizes this vector to be of length 1
   * If the vector is (0, 0), it remains at (0, 0)
   */
  public normalized() {
    const len = Math.hypot(this.x, this.y);
    if (len == 0) return this.copy();
    return new Vec2(
      this.x / len,
      this.y / len
    );
  }

  /**
   * Reurns a copy of this vector with its X and Y
   * components rounded (to the nearest integer)
   */
  public rounded() {
    return new Vec2(
      Math.round(this.x),
      Math.round(this.y)
    );
  }

  /** Returns a copy of this vector, which can be mutated independently. */
  public copy() {
    return new Vec2(this.x, this.y);
  }

  /** Returns a tuple containing the X and Y values of this vector */
  public asTuple(): [ number, number ] {
    return [ this.x, this.y ];
  }

  /** Returns true if this vector is zero, and false otherwise */
  public isZero(): boolean {
    return this.x == 0 && this.y == 0;
  }

  /** Returns a string in the format `Vec2(x, y)` */
  public toString() {
    return `Vec2(${this.x}, ${this.y})`;
  }
}
