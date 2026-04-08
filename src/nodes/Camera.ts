import { Peek } from '../peek';
import { Gen } from '../resources/Gen.ts';
import { HitBox, SquareBox } from '../resources/HitBox';
import { Vec2 } from '../resources/Vec';
import { interpolateDelta, lerp } from '../util/math';
import { PNode } from './PNode';
import { Scene } from './Scene';

export interface FollowParams {
  /** Whether the camera should follow the target smoothly */
  smooth: boolean;

  /** 0-1, how fast the camera should follow its target */
  followSpeed: number;

  /** How far ahead the camera should move */
  aheadMultiplier: number;
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
    aheadMultiplier: 2.0,
  };
  private followingNode: PNode | undefined;
  private followingNodes: PNode[] | undefined;
  public isCurrentCamera = true;

  /** Follows a node around the screen */
  public follow(node: PNode | undefined, snap = true): this {
    this.followingNode = node;
    this.followingNodes = undefined;
    if (snap && node !== undefined) {
      this.x = this.lastX = node.pos.x;
      this.y = this.lastY = node.pos.y;
    }
    return this;
  }

  /** Follows multiple nodes around the screen, keeping them centered! */
  public followMultiple(nodes: PNode[]): this {
    this.followingNode = undefined;
    this.followingNodes = nodes;
    return this;
  }

  /** Creates a camera */
  public constructor() {
    super();
    this.id = Camera.currCameraID++;
  }

  /** Runs when the camera is ready within the scene */
  protected override onEnter(): void {}

  /** Registers this camera in the scene */
  protected override onReparent(
    oldParent: PNode | undefined,
    newParent: PNode | undefined,
  ): void {
    const oldScene = oldParent?.parentScene;
    const newScene = newParent?.parentScene;

    if (oldScene && oldScene._innerCamera === this) {
      // Remove this camera from the old parent scene
      oldScene._innerCamera = undefined;
    }

    // Get the parent scene
    if (newScene && !newScene.getCamera()) {
      // Add this camera to the scene list
      newScene._innerCamera = this;
    }
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
    let h: HitBox;
    if (this.followingNode) {
      h = this.followingNode.getHitbox(Peek.snapToGrid);
    } else if (this.followingNodes) {
      let avgX = 0;
      let avgY = 0;
      for (const n of this.followingNodes) {
        const nh = n.getHitbox(Peek.snapToGrid);
        avgX += nh.x;
        avgY += nh.y;
      }
      h = new SquareBox(0, 0);
      h.x = avgX / this.followingNodes.length;
      h.y = avgY / this.followingNodes.length;
    } else {
      h = this.getHitbox(Peek.snapToGrid);
    }
    const { x, y } = h;

    if (this.followParams.smooth) {
      // Calculate smooth speed
      this.speedX = lerp(
        0.94 * this.speedX,
        x - this.lastX,
        interpolateDelta(0.3, delta),
      );
      this.speedY = lerp(
        0.94 * this.speedY,
        y - this.lastY,
        interpolateDelta(0.3, delta),
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

  /** Converts world-space to screen-space coordinates given an XY position */
  public worldToScreen(x: number, y: number): Vec2 {
    return new Vec2(
      x - (this.x + this.shakeX - Peek.screenWidth * 0.5),
      y - (this.y + this.shakeY - Peek.screenHeight * 0.5),
    );
  }

  /** Converts world-space to screen-space coordinates given a vector */
  public worldToScreenVec(v: Vec2): Vec2 {
    return v.subRet(
      this.x + this.shakeX - Peek.screenWidth * 0.5,
      this.y + this.shakeY - Peek.screenHeight * 0.5,
    );
  }

  /** Converts screen-space to world-space coordinates given an XY position */
  public screenToWorld(x: number, y: number): Vec2 {
    return new Vec2(
      x + this.x + this.shakeX - Peek.screenWidth * 0.5,
      y + this.y + this.shakeY - Peek.screenHeight * 0.5,
    );
  }

  /** Converts screen-space to world-space coordinates given a vector */
  public screenToWorldVec(v: Vec2): Vec2 {
    return v.addRet(
      this.x + this.shakeX - Peek.screenWidth * 0.5,
      this.y + this.shakeY - Peek.screenHeight * 0.5,
    );
  }

  /**
   * Gets the center position of the camera (after smoothing, moving, and all
   * other screen transformations). This equates to getting the center of the
   * screen when converted to world-space.
   */
  public getCenter() {
    const x = this.x + this.shakeX - Peek.screenWidth * 0.5;
    const y = this.y + this.shakeY - Peek.screenHeight * 0.5;
    if (Peek.snapToGrid) {
      return new Vec2(Math.round(x), Math.round(y));
    } else {
      const scale = Peek.getPixelScale();
      return new Vec2(
        Math.round(x * scale) / scale,
        Math.round(y * scale) / scale,
      );
    }
  }

  /** Gets the position of this camera. */
  public getCameraPos() {
    const x = Math.round(this.x + this.shakeX);
    const y = Math.round(this.y + this.shakeY);
    if (Peek.snapToGrid) {
      return new Vec2(Math.round(x), Math.round(y));
    } else {
      const scale = Peek.getPixelScale();
      return new Vec2(
        Math.round(x * scale) / scale,
        Math.round(y * scale) / scale,
      );
    }
  }

  /**
   * Does the camera translation! This method is called internally by Peek.
   * It relies on `.getHitbox()` to get the global position within the scene.
   * @internal
   */
  public _doTransform() {
    let finalX = this.x + this.shakeX - Peek.screenWidth * 0.5;
    let finalY = this.y + this.shakeY - Peek.screenHeight * 0.5;

    if (Peek.snapToGrid) {
      finalX = Math.round(finalX);
      finalY = Math.round(finalY);
    } else {
      // Snap to screen pixel grid instead of virtual grid!
      const scale = Peek.getPixelScale();
      finalX = Math.round(finalX * scale) / scale;
      finalY = Math.round(finalY * scale) / scale;
    }

    Peek.translate(-finalX, -finalY);
  }
}
