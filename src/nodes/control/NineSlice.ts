import { Texture } from '../../resources/Texture';
import { HasTexture } from '../../util/HasTexture';
import { ControlNode } from './ControlNode';

/** A 9-slice rectangle that scales without stretching corners */
export class NineSlice extends ControlNode implements HasTexture {
  private texture: Texture | undefined;

  // [tl, t, tr, l, c, r, bl, b, br]
  private patches: [
    Texture | null, Texture | null, Texture | null,
    Texture | null, Texture | null, Texture | null,
    Texture | null, Texture | null, Texture | null,
  ] | undefined;

  /** Split points defining the 9 regions */
  private splitLeft = 0;
  private splitRight = 0;
  private splitTop = 0;
  private splitBottom = 0;

  /** Sets the texture of this rect. */
  public setTexture(texture: Texture): this {
    this.texture = texture;
    this.updatePatterns();
    return this;
  }

  /** Sets the split points for the 9-slice scaling. */
  public setSplitPoints(
    left: number, right: number,
    top: number, bottom: number
  ): this {
    this.splitLeft = Math.max(0, left);
    this.splitRight = Math.max(0, right);
    this.splitTop = Math.max(0, top);
    this.splitBottom = Math.max(0, bottom);

    if (this.texture) {
      this.updatePatterns();
    }
    return this;
  }

  /**
   * Updates the canvas patterns
   * based on the current texture and split points
   */
  private updatePatterns() {
    if (!this.texture) return;

    const texWidth = this.texture.getWidth();
    const texHeight = this.texture.getHeight();

    // Clamp split points to texture dimensions
    const left = Math.min(this.splitLeft, texWidth);
    const right = Math.min(this.splitRight, texWidth - left);
    const top = Math.min(this.splitTop, texHeight);
    const bottom = Math.min(this.splitBottom, texHeight - top);
    const centerWidth = texWidth - left - right;
    const centerHeight = texHeight - top - bottom;

    this.patches = [
      this.createPattern(0, 0, left, top),
      this.createPattern(left, 0, centerWidth, top),
      this.createPattern(left + centerWidth, 0, right, top),

      this.createPattern(0, top, left, centerHeight),
      this.createPattern(left, top, centerWidth, centerHeight),
      this.createPattern(left + centerWidth, top, right, centerHeight),

      this.createPattern(0, top + centerHeight, left, bottom),
      this.createPattern(left, top + centerHeight, centerWidth, bottom),
      this.createPattern(left + centerWidth, top + centerHeight, right, bottom),
    ];
  }

  /** Creates a canvas pattern from a region of the texture */
  private createPattern(
    sx: number, sy: number, sw: number, sh: number
  ): Texture | null {
    if (sw <= 0 || sh <= 0 || !this.texture) return null;
    return this.texture.crop(sx, sy, sw, sh);
  }

  /** Draws the Rect9 (internal Control node override) */
  protected innerDraw(width: number, height: number): void {
    if (!this.texture || !this.patches) return;

    // TODO: debugger hook for missing split points

    const left = Math.min(this.splitLeft, width);
    const right = Math.min(this.splitRight, width - left);
    const top = Math.min(this.splitTop, height);
    const bottom = Math.min(this.splitBottom, height - top);
    const centerWidth = width - left - right;
    const centerHeight = height - top - bottom;

    const [
      tl, t, tr,
      l, c, r,
      bl, b, br
    ] = this.patches;

    // Draw the 9 regions
    this.drawRegion(tl, 0, 0, left, top);
    this.drawRegion(t, left, 0, centerWidth, top);
    this.drawRegion(tr, left + centerWidth, 0, right, top);

    this.drawRegion(l, 0, top, left, centerHeight);
    this.drawRegion(c, left, top, centerWidth, centerHeight);
    this.drawRegion(r, left + centerWidth, top, right, centerHeight);

    this.drawRegion(bl, 0, top + centerHeight, left, bottom);
    this.drawRegion(b, left, top + centerHeight, centerWidth, bottom);
    this.drawRegion(br, left + centerWidth, top + centerHeight, right, bottom);
  }

  /** Draws a single region with a pattern */
  private drawRegion(
    pattern: Texture | null,
    x: number, y: number,
    width: number, height: number
  ) {
    if (!pattern || width <= 0 || height <= 0) return;
    pattern.draw(x, y, width, height);
  }
}
