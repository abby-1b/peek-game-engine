import { pickRandom, randomRange } from '../util/math';
import { Color, ColorGen, ColorGradient, ColorList } from './Color';
import { atlasColor, Texture } from './Texture';

interface BitNoiseData {
  colors: ColorGen,
  mirrorX?: boolean,
  mirrorY?: boolean,
}

interface SplatterData {
  backgroundColor?: Color,
  colors?: ColorGen,
  splatterCount?: number,
  widthRange?: [number, number],
  heightRange?: [number, number],
}

/** Asset generation tool */
export class Gen {
  /**
   * Generates a texture with a given set of colors.
   * Defaults to black and white.
   */
  public static bitNoise(
    width: number, height: number,
    data?: BitNoiseData
  ) {
    // Get the colors that the image will have
    const colors = data && data.colors
      ? data.colors
      : new ColorGradient([ Color.BLACK, Color.WHITE ]);
    
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
    width: number, height: number,
    data?: SplatterData
  ) {
    // Get the ranges for the width/height of the rectangles
    const widthRange = data?.widthRange ?? [ 1, (width + height) / 20 ];
    const heightRange = data?.heightRange ?? [ 1, (width + height) / 20 ];

    // Get the rectangle count
    const avgArea =
      ((widthRange[0] + widthRange[1]) / 2) *
      ((heightRange[0] + heightRange[1]) / 2);
    const rectCount = data?.splatterCount ?? (width * height / (2 * avgArea));

    // Get the drawing colors
    const colors = data?.colors ?? new ColorList([ Color.WHITE ]);

    // Make the texture
    const tex = new Texture(width, height);
    tex.fill(data?.backgroundColor ?? Color.TRANSPARENT);

    // Generate
    for (let i = 0; i < rectCount; i++) {
      const w = ~~randomRange(...widthRange);
      const h = ~~randomRange(...heightRange);

      const x = ~~randomRange(0, width - w);
      const y = ~~randomRange(0, height - h);

      atlasColor(colors.gen());
      tex.fillRect(x, y, w, h);
    }

    return tex;
  }
}
