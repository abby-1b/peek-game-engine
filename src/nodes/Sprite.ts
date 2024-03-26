import { Peek } from '../peek';
import { Texture } from '../resources/Texture';
import { BLEND_MODE_MAPPINGS, BlendMode } from '../util/BlendMode';
import { Node } from './Node';

/** A sprite draws a texture to the screen. */
export class Sprite extends Node {
  public readonly texture: Texture | undefined;
  public readonly blendMode: BlendMode = BlendMode.NORMAL;
  public isCentered: boolean = false;

  /** Sets the texture for this sprite */
  public setTexture(texture: Texture): this {
    (this as { texture: Texture }).texture = texture;
    return this;
  }

  /** Sets the blend mode for this sprite! */
  public setBlendMode(blendMode: BlendMode): this {
    (this as { blendMode: BlendMode }).blendMode = blendMode;
    return this;
  }

  /**
   * Changes whether this sprite displays with the origin at the center,
   * or the top-left.
   */
  public setCentered(isCentered: boolean = true): this {
    this.isCentered = isCentered;
    return this;
  }

  /** Draws this Sprite */
  protected draw() {
    if (!this.texture) return;
    Peek.ctx.globalCompositeOperation = BLEND_MODE_MAPPINGS[this.blendMode];
    // Console.log(this.pos);
    this.texture.draw(
      this.isCentered ? -this.texture.width  / 2 : 0,
      this.isCentered ? -this.texture.height / 2 : 0
    );
  }
}
