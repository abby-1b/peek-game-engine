
/** A color defined as RGBA, with values from 0-255 */
export class Color {
  // Static colors
  public static TRANSPARENT = new Color(0, 0).fillStylePreInit();
  public static BLACK = new Color(0).fillStylePreInit();
  public static WHITE = new Color(255).fillStylePreInit();
  public static CUM = new Color(238, 257, 222, 156).fillStylePreInit();
  public static RED = new Color(255, 0, 0).fillStylePreInit();
  public static GREEN = new Color(0, 255, 0).fillStylePreInit();
  public static BLUE = new Color(0, 0, 255).fillStylePreInit();

  // Color properties
  private red: number;
  private green: number;
  private blue: number;
  private alpha: number;

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
