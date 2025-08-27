import { Peek } from '../peek';
import { SquareBox } from '../resources/HitBox';
import { Texture } from '../resources/Texture';
import { BlendMode, BlendModeChangeable } from '../util/BlendMode';
import { HasTexture } from '../util/HasTexture';
import { HitBox } from '../resources/HitBox';
import { PNode } from './PNode';
import { AnimationController } from '../resources/AnimationController';
import { AnimationData } from '../resources/AnimationData';

/** A sprite draws a texture to the screen. */
export class Sprite extends PNode implements HasTexture, BlendModeChangeable {
  public texture?: Texture = undefined;
  public blendMode: BlendMode = BlendMode.NORMAL;
  public scale = 1;

  public animation?: AnimationController;

  public isCentered = true; 
  public isFlipped = false;

  protected hitBox = new SquareBox(0, 0);

  /** Creates a sprite */
  public constructor() {
    super();
  }

  /** Sets the animation for this sprite */
  public setAnimation(animation: AnimationData): this {
    this.animation = new AnimationController(animation);
    return this;
  }

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

  /** Sets this sprite as centered or not centered */
  public setCentered(centered = true): this {
    this.isCentered = centered;
    return this;
  }

  /** Processes animations */
  protected override process(delta: number): void {
    this.animation?.update(delta);
  }

  /** Draws this Sprite */
  protected override draw() {
    // Don't draw if there's no texture
    if (!this.texture) return;

    Peek.setBlendMode(this.blendMode);

    // Flip
    if (this.isFlipped) Peek.flipH();

    if (this.animation) {
      const sourceData = this.animation.getCurrent();
      let dx = sourceData.offsetX;
      let dy = sourceData.offsetY;
      if (this.isCentered) {
        dx += Math.floor(this.scale * -this.animation.getFrameWidth() / 2);
        dy += Math.floor(this.scale * -this.animation.getFrameHeight() / 2);
      }
      this.texture.draw(
        sourceData.x,
        sourceData.y,
        sourceData.w,
        sourceData.h,
        dx, dy,
        this.scale * sourceData.w,
        this.scale * sourceData.h,
      );
    } else {
      let dx = 0;
      let dy = 0;
      if (this.isCentered) {
        dx = Math.floor(this.scale * -this.texture.getWidth()  / 2);
        dy = Math.floor(this.scale * -this.texture.getHeight() / 2);
      }
      this.texture.draw(
        dx, dy,
        this.scale * this.texture.getWidth()!,
        this.scale * this.texture.getHeight()!,
      );
    }

    Peek.setBlendMode(BlendMode.NORMAL);
  }

  /** Gets this sprite's hitbox */
  public override getHitbox(
    integer: boolean,
  ): HitBox {
    if (this.animation) {
      this.hitBox.w = this.animation.getFrameWidth();
      this.hitBox.h = this.animation.getFrameHeight();
    } else {
      this.hitBox.w = this.scale * (this.texture?.getWidth() ?? 0);
      this.hitBox.h = this.scale * (this.texture?.getHeight() ?? 0);
    }
    return super.getHitbox(integer, this.hitBox, this.isCentered);
  }
}
