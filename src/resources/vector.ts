
/** A Vector with two floating point components! */
export class Vec2 {
  public x: number;
  public y: number;

  /** Constructs a 2D vector given its X and Y components. */
  public constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /// SELF METHODS ///

  /** Sets the components of this vector! */
  public setNum(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /** Sets the components to the corresponding components of another vector */
  public setVec(v: Vec2) {
    this.x = v.x;
    this.y = v.y;
  }

  /** Adds another vector to this one */
  public addVec(v: Vec2) {
    this.x += v.x;
    this.y += v.y;
  }

  /** Adds two numbers to this vector */
  public addNum(x: number, y: number) {
    this.x += x;
    this.y += y;
  }

  /** Subtracts another vector to from one */
  public subVec(v: Vec2) {
    this.x -= v.x;
    this.y -= v.y;
  }

  /** Subtracts two numbers from this vector */
  public subNum(x: number, y: number) {
    this.x -= x;
    this.y -= y;
  }

  /** Multiplies this vector by another */
  public multVec(v: Vec2) {
    this.x *= v.x;
    this.y *= v.y;
  }

  /** Multiplies each component of this vector by a number */
  public multNum(x: number, y: number) {
    this.x *= x;
    this.y *= y;
  }

  /** Divides this vector by another */
  public divVec(v: Vec2) {
    this.x /= v.x;
    this.y /= v.y;
  }

  /** Divides each component of this vector by a number */
  public divNum(x: number, y: number) {
    this.x /= x;
    this.y /= y;
  }

  /** Normalizes this vector in place */
  public normalize() {
    const d = Math.hypot(this.x, this.y);
    if (d == 0) {
      return;
    }
    this.x /= d;
    this.y /= d;
  }

  /**  */
  public moveTowards(v: Vec2, i: number) {
    this.x = this.x * (1 - i) + v.x * i;
    this.y = this.y * (1 - i) + v.y * i;
  }

  /**  */
  public length() {
    return Math.hypot(this.x, this.y);
  }

  /**  */
  public distVec(v: Vec2) {
    return Math.hypot(
      v.x - this.x,
      v.y - this.y,
    );
  }

  /**  */
  public lengthSq() {
    return this.x ** 2 + this.y ** 2;
  }

  /** Checks if this vector equals another */
  public equalsVec(v: Vec2) {
    return this.x == v.x && this.y == v.y;
  }

  /** Checks if this vector equals a set of numbers */
  public equalsNum(x: number, y: number) {
    return this.x == x && this.y == y;
  }

  /**  */
  public randInCircle(radius: number) {
    const a = Math.random() * 6.2831853072;
    const d = Math.sqrt(Math.random()) * radius / 2;
    this.x = Math.cos(a) * d;
    this.y = Math.sin(a) * d;
  }

  /**  */
  public copy(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  /** Returns this vector as a string in the format '(x, y)' */
  public toString() {
    return `(${this.x}, ${this.y})`;
  }

  /// STATIC METHODS ///

  /** Adds two vectors together without mutating them */
  public static addVec(a: Vec2, b: Vec2) {
    return new Vec2(a.x + b.x, a.y + b.y);
  }

  /** Subtracts a vector from another without mutating either */
  public static subVec(a: Vec2, b: Vec2) {
    return new Vec2(a.x - b.x, a.y - b.y);
  }

  /** Multiplies two vectors without mutating them */
  public static multVec(a: Vec2, b: Vec2) {
    return new Vec2(a.x - b.x, a.y - b.y);
  }

  /** Divides two vectors without mutating them */
  public static divVec(a: Vec2, b: Vec2) {
    return new Vec2(a.x - b.x, a.y - b.y);
  }
}
