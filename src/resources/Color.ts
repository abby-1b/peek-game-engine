
/** A color defined as RGBA, with values from 0-255 */
export class Color {
  // Static colors
  public static TRANSPARENT = new Color(0, 0).fillStylePreInit();
  public static BLACK = new Color(0).fillStylePreInit();
  public static WHITE = new Color(255).fillStylePreInit();
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
  
  public constructor(luminance: number);
  public constructor(luminance: number, alpha: number);
  public constructor(red: number, green: number, blue: number);
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
}
