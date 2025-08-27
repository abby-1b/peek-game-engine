import { Peek } from '../../peek';
import { Texture } from '../../resources/Texture';
import { Vec2 } from '../../resources/Vec';
import { DrawWriteable } from '../../util/Drawable';
import { HasTexture } from '../../util/HasTexture';
import { ControlNode } from './ControlNode';

/** A textured rectangle */
export class TextureRect extends ControlNode implements HasTexture {
  // private texture: Texture | undefined;
  private pattern: CanvasPattern | null | undefined;

  /** How much the texture is offset from the top-left of the rect */
  public offset = Vec2.zero();

  /**
   * Sets the texture of this rect.
   * 
   * Due to canvas limitations, this creates an intermediate canvas which is
   * then used to draw the texture repeatedly. Due to this, any changes to the
   * source texture will not be reflected after the texture is set.
   * @param texture 
   * @returns 
   */
  public setTexture(texture: Texture): this {
    // this.texture = texture;
    
    // Create an intermediate canvas
    const intermediateCanvas = new OffscreenCanvas(
      texture.getWidth(), texture.getHeight()
    );
    const ctx = intermediateCanvas.getContext('2d')!;

    // Put the texture into the canvas
    texture.draw(0, 0, ctx as unknown as DrawWriteable);
    // ctx.drawImage(
    //   ...atlasSource(texture),
    //   0, 0, texture.getWidth(), texture.getHeight()
    // );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.pattern = (Peek as any).ctx.createPattern(
      intermediateCanvas, 'repeat'
    );
    return this;
  }

  /**  */
  protected innerDraw(width: number, height: number): void {
    if (!this.pattern) { return; }
    const offsX = Math.round(this.offset.x);
    const offsY = Math.round(this.offset.y);

    Peek.translate(offsX, offsY);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Peek as any).ctx.fillStyle = this.pattern;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Peek as any).ctx.fillRect(-offsX, -offsY, width, height);
    Peek.translate(-offsX, -offsY);
  }
}
