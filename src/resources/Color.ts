import { lerp, pickRandom } from '../util/math';

/** A color defined as RGBA, with values from 0-255 */
export class Color {
  // Static colors
  public static TRANSPARENT = new Color(0, 0).fillStylePreInit();
  public static BLACK = new Color(0).fillStylePreInit();
  public static WHITE = new Color(255).fillStylePreInit();
  public static DARK_GRAY = new Color(64).fillStylePreInit();
  public static GRAY = new Color(128).fillStylePreInit();
  public static LIGHT_GRAY = new Color(192).fillStylePreInit();
  public static RED = new Color(255, 0, 0).fillStylePreInit();
  public static ORANGE = new Color(255, 128, 0).fillStylePreInit();
  public static YELLOW = new Color(255, 255, 0).fillStylePreInit();
  public static GREEN = new Color(0, 255, 0).fillStylePreInit();
  public static AQUA = new Color(0, 255, 255).fillStylePreInit();
  public static BLUE = new Color(0, 0, 255).fillStylePreInit();

  // Color properties
  public readonly red: number;
  public readonly green: number;
  public readonly blue: number;
  public readonly alpha: number;

  // Cache the `fillStyle` string
  private fillStyleCache?: string;
  
  /**
   * Constructs a color with a given luminance for R, G, and B,
   * specified in the range of 0 to 255.
   * 
   * Eg: Color(27) = Color(27, 27, 27, 255)
   * @param luminance The brightness of the color
   */
  public constructor(luminance: number);
  /**
   * Constructs a color witha given luminance and alpha,
   * specified in the range of 0 to 255.
   * 
   * Eg: Color(255, 78) = Color(255, 255, 255, 78)
   * @param luminance The brightness of the color
   * @param alpha The transparency of the color
   */
  public constructor(luminance: number, alpha: number);
  /**
   * Constructs a color with given red, green, and blue values,
   * specified in the range of 0 to 255.
   * 
   * Eg: Color(50, 100, 150) = Color(50, 100, 150, w55)
   * @param red The amount of red
   * @param green The amount of green
   * @param blue The amount of blue
   */
  public constructor(red: number, green: number, blue: number);
  /**
   * Constructs a color with given red, green, blue, and alpha values,
   * specified in the range of 0 to 255.
   * 
   * @param red The amount of red
   * @param green The amount of green
   * @param blue The amount of blue
   * @param alpha The transparency of the color
   */
  public constructor(red: number, green: number, blue: number, alpha: number);
  
  /** Constructs a color */
  public constructor(
    red: number,
    green?: number,
    blue?: number,
    alpha?: number
  ) {
    this.red = red;
    this.green = arguments.length < 3 ? red : green!;
    this.blue = arguments.length < 3 ? red : blue!;
    this.alpha = [ 0, 255, green!, 255, alpha! ][arguments.length];
  }

  /** Gets the `fillStyle` string of this color. */
  public fillStyle() {
    if (!this.fillStyleCache) {
      this.fillStyleCache = `rgba(${
        this.red
      },${
        this.green
      },${
        this.blue
      },${
        this.alpha / 255
      })`;
    }
    return this.fillStyleCache;
  }

  /** Pre-initiates the `fillStyle` property and returns this object. */
  public fillStylePreInit() {
    this.fillStyle();
    return this;
  }

  /**
   * Returns a completely random color, with each color channel randomized,
   * and an alpha of 255.
   * @returns The color
   */
  public static random(): Color {
    return new Color(
      Math.random() * 255,
      Math.random() * 255,
      Math.random() * 255,
    );
  }
}

/** Generates random colors with some given parameters */
export interface ColorGen {
  /** Generates the color */
  gen(): Color
}

/** A list of colors */
export class ColorList implements ColorGen {
  /** Creates a ColorList */
  public constructor(private list: Color[]) {}

  /**
   * Picks a color from the list
   * @param value A number from 0 to 1. 0 is the first color and 1 the last
   */
  public pick(value: number): Color;
  
  /**
   * Picks a color from the list
   * @param value The index of the number to pick
   * @param integer Switches `value` from (0, 1) to (0, len)
   */
  public pick(value: number, integer: true): Color;

  /** Picks a color from the list */
  public pick(value: number, integer = false) {
    if (integer) {
      return this.list[value];
    } else {
      return this.list[~~(value * this.list.length)];
    }
  }

  /** Picks a random color from the list */
  public gen() { return pickRandom(this.list); }
}

/** A smooth, linearly-interpolated gradient of colors */
export class ColorGradient implements ColorGen {
  /** Creates a ColorGradient */
  public constructor(private list: Color[]) {}

  /** Picks a color from the gradient, given a number from 0 to 1 */
  public pick(value: number) {
    const idx = value * (this.list.length - 1);
    const lowIdx = Math.floor(idx);
    const hiIdx = Math.ceil(idx);
    if (lowIdx == idx) {
      return this.list[idx];
    } else {
      const i = idx - lowIdx;
      return new Color(
        lerp(this.list[lowIdx].red  , this.list[hiIdx].red  , i),
        lerp(this.list[lowIdx].green, this.list[hiIdx].green, i),
        lerp(this.list[lowIdx].blue , this.list[hiIdx].blue , i),
        lerp(this.list[lowIdx].alpha, this.list[hiIdx].alpha, i),
      );
    }
  }

  /** Picks a random color from the gradient */
  public gen() { return this.pick(Math.random()); }
}

