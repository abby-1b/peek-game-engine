import { Peek } from '../peek';
import { lerp } from '../util/math';
import { PNode } from './PNode';
import { Scene } from './Scene';


export interface FollowParams {
  /** Whether the camera should follow the target smoothly (aka. not exactly) */
  smooth: boolean,

  /** 0-1, how fast the camera should follow its target */
  followSpeed: number,

  /** How far ahead the camera should move */
  aheadMultiplier: number,
}

/** Wherever this node goes will be centered on the screen. */
export class Camera extends PNode {
  private shakeAmount = 0;

  private lastX = 0;
  private lastY = 0;

  private x = 0;
  private y = 0;

  private speedX = 0;
  private speedY = 0;

  private shakeX = 0;
  private shakeY = 0;

  public followParams: FollowParams = {
    smooth: false,
    followSpeed: 0.1,
    aheadMultiplier: 2.0
  };
  public isActive = true;

  /** Registers the camera in the scene */
  public override ready() {
    // Get the parent scene
    let parent = this.parent;
    while (!(parent instanceof Scene)) {
      parent = parent.parent;
      if (parent == undefined) { return; }
    }
    const parentScene = parent as Scene;
    
    // Add this camera to the scene's list
    parentScene.cameras.push(new WeakRef(this));
  }

  /** Makes the camera follow its target smoothly */
  public smooth(isSmooth = true): this {
    this.followParams.smooth = isSmooth;
    return this;
  }

  /** Does camera shake */
  public shake(amount: number, add = false) {
    if (add) {
      this.shakeAmount += amount;
    } else {
      this.shakeAmount = Math.max(amount, this.shakeAmount);
    }
  }

  /** Handles camera movement */
  public override process(delta: number) {
    const { x, y } = this.getHitbox(true);

    if (this.followParams.smooth) {
      // Calculate smooth speed
      this.speedX = lerp(0.94 * this.speedX, x - this.lastX, 0.3 ** delta);
      this.speedY = lerp(0.94 * this.speedY, y - this.lastY, 0.3 ** delta);
  
      this.x = lerp(this.x, x, this.followParams.followSpeed);
      this.y = lerp(this.y, y, this.followParams.followSpeed);
      this.x += this.speedX * this.followParams.aheadMultiplier;
      this.y += this.speedY * this.followParams.aheadMultiplier;
  
      this.lastX = x;
      this.lastY = y;
    } else {
      // Go to the current position (no interpolation)
      this.x = x;
      this.y = y;
    }

    // Camera shake
    if (this.shakeAmount < 1) {
      this.shakeAmount = 0;
    }
    this.shakeAmount *= 0.9;
    this.shakeX = (Math.random() - 0.5) * this.shakeAmount;
    this.shakeY = (Math.random() - 0.5) * this.shakeAmount;
  }

  /**
   * Does the camera translation! This method is called internally by Peek.
   * It relies on `.getHitbox()` to get the global position within the scene.
   */
  public doTransform() {
    const camX = this.x;
    const camY = this.y;

    const finalX = Math.round(Peek.screenWidth  * 0.5 - camX + this.shakeX);
    const finalY = Math.round(Peek.screenHeight * 0.5 - camY + this.shakeY);
    Peek.ctx.translate(finalX, finalY);
  }
}
