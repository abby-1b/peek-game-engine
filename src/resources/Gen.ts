import { Color } from './Color';
import { Texture } from './Texture';

interface BitNoiseData {
  colors: Color[],
  mirrorX?: boolean
  mirrorY?: boolean
}

/** Asset generation tool */
export class Gen {
  /**
   * Generates a texture with a given set of colors.
   * Defaults to black and white.
   */
  public static bitNoise(width: number, height: number, data?: BitNoiseData) {
    // Get the colors that the image will have
    const colors = data && data.colors && data.colors.length > 0
      ? data.colors
      : [ Color.BLACK, Color.WHITE ];
    
    // Make the texture
    const tex = new Texture(width, height);

    // Fill it with random colors (from the array)
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const colIdx = Math.floor(Math.random() * colors.length);
        tex.setPixel(x, y, colors[colIdx]);
      }
    }
    
    // Return
    return tex;
  }
}
