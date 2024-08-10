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

  /** Adds the given values to this vector */
  public add(x: number, y: number) {
    this.x += x;
    this.y += y;
  }

  /** Adds the values of another vector to this one */
  public addVec(v: Vec2) {
    this.x += v.x;
    this.y += v.y;
  }

  /**
   * Adds the given values to this vector.
   * The values are multiplied by the given scalar before being added.
   */
  public addWithScalar(x: number, y: number, scalar: number) {
    this.x += x * scalar;
    this.y += y * scalar;
  }
  
  /**
   * Adds the values of another vector to this one.
   * The values are multiplied by the given scalar before being added.
   */
  public addVecWithScalar(v: Vec2, scalar: number) {
    this.x += v.x * scalar;
    this.y += v.y * scalar;
  }
  
  /** Subtracts the given values to this vector */
  public sub(x: number, y: number) {
    this.x -= x;
    this.y -= y;
  }

  /** Subtracts the values of another vector from this one */
  public subVec(v: Vec2) {
    this.x -= v.x;
    this.y -= v.y;
  }

  /**
   * Subtracts the given values from this vector.
   * The values are multiplied by the given scalar before being subtracted.
   */
  public subWithScalar(x: number, y: number, scalar: number) {
    this.x -= x * scalar;
    this.y -= y * scalar;
  }
  
  /**
   * Subtracts the values of another vector from this one.
   * The values are multiplied by the given scalar before being subtracted.
   */
  public subVecWithScalar(v: Vec2, scalar: number) {
    this.x -= v.x * scalar;
    this.y -= v.y * scalar;
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

  /**
   * Adds the given values to this vector, returning the mutated Vec.
   * The values are multiplied by the given scalar before being added.
   */
  public addWithScalarRet(x: number, y: number, scalar: number) {
    return new Vec2(this.x + x * scalar, this.y + y * scalar);
  }
  
  /**
   * Adds the values of another vector to this one, returning the mutated Vec.
   * The values are multiplied by the given scalar before being added.
   */
  public addVecWithScalarRet(v: Vec2, scalar: number) {
    return new Vec2(this.x + v.x * scalar, this.y + v.y * scalar);
  }

  /**
   * Subtracts the values of another vector
   * from this one, returning the mutated Vec.
   */
  public subRet(x: number, y: number): Vec2 {
    return new Vec2(this.x - x, this.y - y);
  }

  /**
   * Subtracts the values of another vector
   * from this one, returning the mutated Vec.
   */
  public subVecRet(v: Vec2): Vec2 {
    return new Vec2(this.x - v.x, this.y - v.y);
  }

  /**
   * Subtracts the given values from this vector, returning the mutated Vec.
   * The values are multiplied by the given scalar before being subtracted.
   */
  public subWithScalarRet(x: number, y: number, scalar: number) {
    return new Vec2(this.x + x * scalar, this.y + y * scalar);
  }
  
  /**
   * Subtracts the values of another vector from this one, returning the mutated
   * Vec. The values are multiplied by the given scalar before being subtracted.
   */
  public subVecWithScalarRet(v: Vec2, scalar: number) {
    return new Vec2(this.x + v.x * scalar, this.y + v.y * scalar);
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
   * Copies the values of another vector into this one,
   * multiplying by the given scalar first.
   */
  public setVecScalar(v: Vec2, scalar: number) {
    this.x = v.x * scalar;
    this.y = v.y * scalar;
  }

  /**
   * Normalizes this vector to be of the specified length (1 by default).
   * If the vector is of length 0, it remains that way.
   */
  public normalize(targetLength = 1) {
    const realLength = Math.hypot(this.x, this.y) / targetLength;
    if (realLength == 0) return;
    this.x /= realLength;
    this.y /= realLength;
  }

  /** Rounds the X and Y components (to the nearest integer) */
  public round() {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
  }

  /**
   * Rotates this vector
   * @param angle The angle (in radians)
   */
  public rotate(angle: number) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const finalX = this.x * cos + this.y * sin;
    const finalY = this.y * cos - this.x * sin;
    this.x = finalX;
    this.y = finalY;
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

  // COMPARING

  /** Checks if this vector's components equal some value */
  public equals(x: number, y: number) {
    return this.x == x && this.y == y;
  }
  
  /** Checks if this vector's components equal some value */
  public equalsVec(v: Vec2) {
    return this.x == v.x && this.y == v.y;
  }

  /** Gets the dot product between two vectors */
  public dot(v: Vec2) {
    return this.x * v.x + this.y * v.y;
  }

  /** Gets the distance from this vector to another */
  public distanceTo(v: Vec2) {
    return Math.hypot(this.x - v.x, this.y - v.y);
  }
  
  /** Gets the distance from this vector to another */
  public distanceSquaredTo(v: Vec2) {
    return (this.x - v.x) ** 2 + (this.y - v.y) ** 2;
  }

  // FETCHING

  /** Gets the length of this vector */
  public length() {
    return Math.hypot(this.x, this.y);
  }
  
  /** Gets the squared length of this vector (`x ** 2 + y ** 2`) */
  public lengthSquared() {
    return this.x ** 2 + this.y ** 2;
  }

  /** Gets the angle of the vector */
  public angle() {
    return Math.atan2(this.x, this.y);
  }

  /**
   * Returns a normalized vector of the specified length (1 by default).
   * If the vector is of length 0, it remains that way.
   */
  public normalized(targetLength = 1) {
    const realLength = Math.hypot(this.x, this.y) / targetLength;
    if (realLength == 0) return this.copy();
    return new Vec2(
      this.x / realLength,
      this.y / realLength
    );
  }

  /**
   * Reurns a copy of this vector with its X and Y
   * components rounded to the nearest integer
   */
  public rounded() {
    return new Vec2(
      Math.round(this.x),
      Math.round(this.y)
    );
  }

  /**
   * Returns a rotated copy of this vector
   * @param angle The angle (in radians)
   */
  public rotated(angle: number) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vec2(
      this.x * cos + this.y * sin,
      this.y * cos - this.x * sin,
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
