import { Peek } from '../peek';
import { Texture } from '../resources/Texture';
import { BlendMode } from '../util/BlendMode';
import { HitBox } from '../util/HitBox';
import { PNode } from './PNode';

/** A sprite draws a texture to the screen. */
export class Sprite extends PNode {
  public readonly texture: Texture | undefined;
  public readonly blendMode: BlendMode = BlendMode.NORMAL;
  public isCentered = true;
  public scale = 1;

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
  protected override draw() {
    // Don't draw if there's no texture
    if (!this.texture) return;

    // Set the blend mode
    Peek.ctx.globalCompositeOperation = this.blendMode;

    // Draw the texture
    this.texture.draw(
      this.isCentered ? Math.floor(this.scale * -this.texture.width  / 2) : 0,
      this.isCentered ? Math.floor(this.scale * -this.texture.height / 2) : 0,
      this.scale * this.texture.width!,
      this.scale * this.texture.height!,
    );

    Peek.ctx.globalCompositeOperation = BlendMode.NORMAL;
  }

  /** Gets this sprite's hitbox! This takes `.isCentered` into account, too. */
  public override getHitbox(
    integer: boolean,
  ): HitBox {
    const tw = this.scale * (this.texture?.width ?? 0);
    const th = this.scale * (this.texture?.height ?? 0);
    return super.getHitbox(
      integer,
      Math.floor(this.isCentered ? Math.floor(-tw / 2) : 0),
      Math.floor(this.isCentered ? Math.floor(-th / 2) : 0),
      tw,
      th,
    );
  }
}
