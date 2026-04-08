import { Peek } from '../../peek';
import { Texture } from '../../resources/Texture';
import { BlendMode } from '../../util/BlendMode';
import { ControlNode } from './ControlNode';

/**
 * A rectangle filled with a texture,
 * scaled to fit while maintaining aspect ratio
 */
export class FillTexture extends ControlNode {
  public texture?: Texture | undefined;

  /** Sets the texture of this rect */
  public setTexture(texture: Texture): this {
    this.texture = texture;
    return this;
  }

  /** Draws this FillTexture */
  protected innerDraw(width: number, height: number) {
    // TODO: add debugger hook for missing texture or zero dimensions
    if (!this.texture || width <= 0 || height <= 0) return;

    const texWidth = this.texture.getWidth();
    const texHeight = this.texture.getHeight();
    if (texWidth <= 0 || texHeight <= 0) return;

    // Apply blend mode
    Peek.setBlendMode(this.blendMode);

    // Calculate scaling to cover rectangle (maintaining aspect ratio)
    const texAspect = texWidth / texHeight;
    const rectAspect = width / height;

    let sx, sy, sw, sh;

    if (texAspect > rectAspect) {
      // Texture is wider relative to rectangle - scale by height
      sh = texHeight;
      sw = texHeight * rectAspect;
      sx = (texWidth - sw) / 2;
      sy = 0;
    } else {
      // Texture is taller relative to rectangle - scale by width
      sw = texWidth;
      sh = texWidth / rectAspect;
      sx = 0;
      sy = (texHeight - sh) / 2;
    }

    // Destination fills the entire output rectangle
    const dx = 0;
    const dy = 0;
    const dw = width;
    const dh = height;

    this.texture.draw(sx, sy, sw, sh, dx, dy, dw, dh);

    // Reset blend mode to normal
    Peek.setBlendMode(BlendMode.NORMAL);
  }
}
