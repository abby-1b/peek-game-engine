import { Color, ColorGen, ColorGradient, ColorList } from './Color';
import { Texture } from './Texture';

interface BitNoiseData {
  colors: ColorGen;
  mirrorX?: boolean;
  mirrorY?: boolean;
}

interface SplatterData {
  backgroundColor?: Color;
  colors?: ColorGen;
  splatterCount?: number;
  widthRange?: [number, number];
  heightRange?: [number, number];
}

/** Asset generation tool */
export class Gen {
  /**
   * Generates a texture with a given set of colors.
   * Defaults to black and white.
   */
  public static bitNoise(
    width: number,
    height: number,
    data?: BitNoiseData,
  ): Texture {
    // Get the colors that the image will have
    const colors =
      data && data.colors
        ? data.colors
        : new ColorGradient([Color.BLACK, Color.WHITE]);

    // Make the texture
    const tex = new Texture(width, height);

    // Fill it with random colors (from the array)
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        tex.setPixel(x, y, colors.gen());
      }
    }

    // Return
    return tex;
  }

  /** Splatters rects of a given size across a texture */
  public static splatter(
    width: number,
    height: number,
    data?: SplatterData,
  ): Texture {
    // Get the ranges for the width/height of the rectangles
    const widthRange = data?.widthRange ?? [1, (width + height) / 20];
    const heightRange = data?.heightRange ?? [1, (width + height) / 20];

    // Get the rectangle count
    const avgArea =
      ((widthRange[0] + widthRange[1]) / 2) *
      ((heightRange[0] + heightRange[1]) / 2);
    const rectCount = data?.splatterCount ?? (width * height) / (2 * avgArea);

    // Get the drawing colors
    const colors = data?.colors ?? new ColorList([Color.WHITE]);

    // Make the texture
    const tex = new Texture(width, height);
    tex.fill(data?.backgroundColor ?? Color.TRANSPARENT);

    // Generate
    for (let i = 0; i < rectCount; i++) {
      const w = ~~Math.randomRange(...widthRange);
      const h = ~~Math.randomRange(...heightRange);

      const x = ~~Math.randomRange(0, width - w);
      const y = ~~Math.randomRange(0, height - h);

      tex.fillRect(x, y, w, h, colors.gen());
    }

    return tex;
  }

  /**
   * Generates a random number in a specified range
   * @param start The start of the range
   * @param end The end of the range
   */
  public static randomRange(start: number, end: number) {
    return Math.random() * (end - start) + start;
  }

  /**
   * Picks a random item from the given array
   * @param array
   */
  public static pickRandom<T>(array: T[]) {
    return array[~~(Math.random() * array.length)];
  }
}

/**
 * Deterministic pseudo-random number generator based on integer coordinates.
 * Outputs are in the range [0, 1), and are fully deterministic given a seed.
 */
export class RNGDeterministic {
  // Internal seed, used for all coordinate-based lookups
  private innerSeed: number;

  /** Creates a new RNG with the given initial seed. */
  public constructor(seed: number) {
    this.innerSeed = seed >>> 0; // Coerce to 32-bit unsigned
  }

  /** Sets the internal seed to a new value. */
  public setSeed(seed: number): void {
    this.innerSeed = seed >>> 0;
  }

  /**
   * Returns a deterministic value for a 1D coordinate.
   * This method is optimized for speed and does not call get2D.
   * @param p Integer coordinate
   * @returns Value in [0, 1)
   */
  public get1D(p: number): number {
    const hash = this.hash1D(this.innerSeed, p);
    return hash / 0x100000000;
  }

  /**
   * Returns a deterministic value for a 2D coordinate.
   * @param x Integer x coordinate
   * @param y Integer y coordinate
   * @returns Value in [0, 1)
   */
  public get2D(x: number, y: number): number {
    const hash = this.hash2D(this.innerSeed, x, y);
    return hash / 0x100000000;
  }

  /**
   * Returns a deterministic value for a 2D coordinate.
   * @param x Integer x coordinate
   * @param y Integer y coordinate
   * @returns Value in [0, 1)
   */
  public get2Dto2D(x: number, y: number): [number, number] {
    const hash = this.hash2D(this.innerSeed, x, y);
    return [(hash & 0xffff) / 0x10000, ((hash >> 16) & 0xffff) / 0x10000];
  }

  /**
   * Advances the internal seed and returns a new deterministic value.
   * Uses a linear congruential generator to update the seed,
   * then returns get1D(0) for that new seed.
   * @returns Value in [0, 1) derived from the updated seed
   */
  public getRolling(): number {
    // LCG constants for full period 2^32
    const a = 1664525;
    const c = 1013904223;
    this.innerSeed = (this.innerSeed * a + c) >>> 0;
    // Use 1D hash with coordinate 0 to produce the output
    const hash = this.hash1D(this.innerSeed, 0);
    return hash / 0x100000000;
  }

  /**
   * 1D hash: mixes seed and a single integer.
   * Returns a 32-bit unsigned integer.
   */
  private hash1D(seed: number, p: number): number {
    let h = seed | 0;
    h = (h ^ p) * 0x9e3779b9;
    h = (h ^ (h >>> 16)) * 0x85ebca6b;
    h = h ^ (h >>> 13);
    return h >>> 0;
  }

  /**
   * 2D hash: mixes seed with x and y.
   * Returns a 32-bit unsigned integer.
   */
  private hash2D(seed: number, x: number, y: number): number {
    let h = seed | 0;
    h = (h ^ x) * 0x9e3779b9;
    h = (h ^ y) * 0x9e3779b9;
    h = (h ^ (h >>> 16)) * 0x85ebca6b;
    h = h ^ (h >>> 13);
    return h >>> 0;
  }
}
