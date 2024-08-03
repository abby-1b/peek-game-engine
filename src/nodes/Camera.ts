import { Peek } from '../peek';
import { Vec2 } from '../resources/Vec';
import { interpolateDelta, lerp } from '../util/math';
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
  private static currCameraID = 0;
  public readonly id: number;

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

  private parentScene?: Scene;

  /** Creates a camera */
  public constructor() {
    super();
    this.id = Camera.currCameraID++;
  }

  /** Runs when the camera is ready within the scene */
  protected override ready(): void {
    this.trySetupCamera();
  }

  /** Registers this camera in the scene */
  protected override moved(): void {
    this.trySetupCamera();
  }

  /** Tries setting up this camera, adding it to the nearest parent scene */
  private trySetupCamera() {
    if (this.parentScene) {
      // Remove this camera from the old parent scene
      this.parentScene.cameras.delete(this.id);
    }

    // Get the parent scene
    let parent = this.parent;
    while (!(parent instanceof Scene)) {
      parent = parent.parent;
      if (parent == undefined) { return; }
    }
    this.parentScene = parent as Scene;
    
    // Add this camera to the scene's list
    this.parentScene.cameras.set(this.id, new WeakRef(this));
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

  /**
   * Handles camera movement. This is called before every other
   * process function to have the exact position of the camera ready.
   * 
   * Inactive cameras are still processed using this function,
   * and are still processed before everything else.
   */
  public cameraProcess(delta: number) {
    const { x, y } = this.getHitbox(true);

    if (this.followParams.smooth) {
      // Calculate smooth speed
      this.speedX = lerp(
        0.94 * this.speedX, x - this.lastX,
        interpolateDelta(0.3, delta)
      );
      this.speedY = lerp(
        0.94 * this.speedY, y - this.lastY,
        interpolateDelta(0.3, delta)
      );
  
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
   * Gets the center position of the camera (after smoothing, moving, and all
   * other screen transformations). This equates to getting the center of the
   * screen when converted to world-space.
   */
  public getCenter() {
    const finalX = Math.round(this.x + this.shakeX - Peek.screenWidth  * 0.5);
    const finalY = Math.round(this.y + this.shakeY - Peek.screenHeight * 0.5);
    return new Vec2(finalX, finalY);
  }

  /** Gets the position of this camera. */
  public getCameraPos() {
    const finalX = Math.round(this.x + this.shakeX);
    const finalY = Math.round(this.y + this.shakeY);
    return new Vec2(finalX, finalY);
  }

  /**
   * Does the camera translation! This method is called internally by Peek.
   * It relies on `.getHitbox()` to get the global position within the scene.
   */
  public doTransform() {
    const finalX = Math.round(this.x + this.shakeX - Peek.screenWidth  * 0.5);
    const finalY = Math.round(this.y + this.shakeY - Peek.screenHeight * 0.5);
    Peek.ctx.translate(-finalX, -finalY);
  }
}
