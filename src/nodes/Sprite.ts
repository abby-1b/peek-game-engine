import { Peek } from '../peek';
import { SquareBox } from '../resources/HitBox';
import { Texture } from '../resources/Texture';
import { BlendMode } from '../util/BlendMode';
import { HasTexture } from '../util/HasTexture';
import { HitBox } from '../resources/HitBox';
import { PNode } from './PNode';

/** A sprite draws a texture to the screen. */
export class Sprite extends PNode implements HasTexture {
  public texture: Texture | undefined;
  public blendMode: BlendMode = BlendMode.NORMAL;
  public scale = 1;

  protected hitBox = new SquareBox(0, 0, 0, 0);

  /** Sets the texture for this sprite */
  public setTexture(texture: Texture): this {
    this.texture = texture;
    return this;
  }

  /** Sets the blend mode for this sprite! */
  public setBlendMode(blendMode: BlendMode): this {
    this.blendMode = blendMode;
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
      Math.floor(this.scale * -this.texture.getWidth()  / 2),
      Math.floor(this.scale * -this.texture.getHeight() / 2),
      this.scale * this.texture.getWidth()!,
      this.scale * this.texture.getHeight()!,
    );

    Peek.ctx.globalCompositeOperation = BlendMode.NORMAL;
  }

  /** Gets this sprite's hitbox! This takes `.isCentered` into account, too. */
  public override getHitbox(
    integer: boolean,
  ): HitBox {
    this.hitBox.w = this.scale * (this.texture?.getWidth() ?? 0);
    this.hitBox.h = this.scale * (this.texture?.getHeight() ?? 0);
    return super.getHitbox(integer, this.hitBox);
  }
}
