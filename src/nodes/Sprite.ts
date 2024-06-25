import { Peek } from '../peek';
import { Texture } from '../resources/Texture';
import { BLEND_MODE_MAPPINGS, BlendMode } from '../util/BlendMode';
import { HitBox } from '../util/HitBox';
import { PNode } from './PNode';

/** A sprite draws a texture to the screen. */
export class Sprite extends PNode {
  public readonly texture: Texture | undefined;
  public readonly blendMode: BlendMode = BlendMode.NORMAL;
  public isCentered: boolean = true;

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
  public setCentered(isCentered: boolean): this {
    this.isCentered = isCentered;
    return this;
  }

  /** Draws this Sprite */
  protected draw() {
    // Don't draw if there's no texture
    if (!this.texture) return;

    // Set the blend mode
    Peek.ctx.globalCompositeOperation = BLEND_MODE_MAPPINGS[this.blendMode];

    // Draw the texture
    this.texture.draw(
      this.isCentered ? ~~(-this.texture.width  / 2) : 0,
      this.isCentered ? ~~(-this.texture.height / 2) : 0
    );
  }

  /** Gets this sprite's hitbox! This takes `.isCentered` into account, too. */
  public getHitbox(): HitBox {
    const tw = this.texture?.width ?? 0;
    const th = this.texture?.height ?? 0;
    return super.getHitbox(
      ~~(this.isCentered ? -tw / 2 : 0),
      ~~(this.isCentered ? -th / 2 : 0),
      tw,
      th,
    );
  }
}
