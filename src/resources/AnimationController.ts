import { deltaToMillis } from '../util/math';
import { AnimationData, FrameData, TagData } from './AnimationData';

/**
 * A class that controls animations for a sprite.
 * It manages the current animation and can queue animations.
 */
export class AnimationController {
  private currentTag?: string = undefined;
  private currentTagData?: TagData = undefined;

  private currentFrameData?: FrameData = undefined;
  private currentFrameIndex: number = 0;

  private speedMultipler: number = 1.0;

  private frameTimer: number = 0;
  // TODO: private repeatCount: number = 0;

  // Queue system
  private queuedTag?: string = undefined;
  private queueType?: 'frame' | 'animation' = undefined;

  /** Constructs an animation controller */
  public constructor(
    private animationData: AnimationData
  ) {}

  /** Gets the currently playing animation */
  public getAnimation(): string | undefined {
    return this.currentTag;
  }

  /** Frame width getter */
  public getFrameWidth() {
    return this.animationData.frameWidth;
  }
  /** Frame height getter */
  public getFrameHeight() {
    return this.animationData.frameHeight;
  }

  /** Sets the current frame directly, without waiting. */
  public setFrame(frame: number, playThrough = false) {
    this.currentFrameIndex = frame;
    this.currentFrameData = this.animationData.getFrameData(
      this.currentFrameIndex
    );
    if (!playThrough) {
      this.currentFrameData.duration = Infinity;
    }
    this.frameTimer = 0;
  }

  /** Plays an animation immediately, starting rendering on this frame */
  public playImmediate(tag: string, restartIfPlaying = false): this {
    if (this.currentTag === tag && !restartIfPlaying) {
      return this;
    }

    this.clearQueue();
    this.setCurrentAnimation(tag);

    return this;
  }

  /** Plays an animation after the current animation frame is over */
  public playAfterFrame(tag: string, restartIfPlaying = false): this {
    // If same tag and not restarting, do nothing
    if (this.currentTag === tag && !restartIfPlaying) {
      return this;
    }

    // If no current animation, play immediately
    if (!this.currentTag) {
      return this.playImmediate(tag, restartIfPlaying);
    }

    // Queue for after current frame
    this.queuedTag = tag;
    this.queueType = 'frame';
    return this;
  }

  /** Plays an animation after the current animation completes */
  public playAfterAnimation(tag: string, restartIfPlaying = false): this {
    // If same tag and not restarting, do nothing
    if (this.currentTag === tag && !restartIfPlaying) {
      return this;
    }

    // If no current animation, play immediately
    if (!this.currentTag) {
      return this.playImmediate(tag, restartIfPlaying);
    }

    // Queue for after current animation completes
    this.queuedTag = tag;
    this.queueType = 'animation';
    return this;
  }

  /** Called by `Sprite` to get the rect of the texture to render. */
  public getCurrent(): FrameData {
    return this.currentFrameData ?? this.animationData.placeholderFrameData();
  }

  /** Should be called by Sprite during update loop */
  public update(delta: number) {
    if (!this.currentTag) return;

    this.frameTimer += deltaToMillis(delta);

    const currentFrameDuration = this.currentFrameData?.duration;
    if (!currentFrameDuration) return;

    const readyForNextFrame =
      this.frameTimer >=
      currentFrameDuration / this.speedMultipler;
    if (!readyForNextFrame) return;

    // Frame queue
    if (this.queueType === 'frame') {
      this.executeQueuedAnimation();
      return;
    }

    const wasLastFrame = this.isLastFrame();
    if (!wasLastFrame) {
      this.advanceFrame();
      return;
    }

    // Animation end queue
    if (this.queueType === 'animation') {
      this.executeQueuedAnimation();
      return;
    }

    // Loop animation
    this.setCurrentAnimation(this.currentTag);
  }

  /** Sets the current animation immediately (called internally) */
  private setCurrentAnimation(tag: string | undefined) {
    if (!tag) {
      this.currentTag = undefined;
      this.currentTagData = undefined;
      this.currentFrameIndex = 0;
      this.currentFrameData = undefined;
      return;
    }

    this.currentTag = tag;
    this.currentTagData = this.animationData.getTagData(tag);

    if (this.currentTagData?.direction === 'backward') {
      this.currentFrameIndex = this.currentTagData.to;
    } else {
      this.currentFrameIndex = this.currentTagData.from;
    }
    this.currentFrameData = this.animationData.getFrameData(
      this.currentFrameIndex
    );

    this.frameTimer = 0;
  }

  /** Clears the queued animation */
  private clearQueue() {
    this.queuedTag = undefined;
    this.queueType = undefined;
  }

  /** Executes the queued animation if any */
  private executeQueuedAnimation() {
    if (this.queuedTag) {
      const tag = this.queuedTag;
      this.clearQueue();
      this.setCurrentAnimation(tag);
    }
  }

  /** Advances to the next frame in the current animation */
  private advanceFrame() {
    if (!this.currentTagData) return;

    if (this.currentTagData.direction === 'backward') {
      this.currentFrameIndex--;
    } else {
      this.currentFrameIndex++;
    }
    
    this.currentFrameData = this.animationData.getFrameData(
      this.currentFrameIndex
    );

    this.frameTimer = 0;
  }

  /** Checks if the current frame is the last frame in the animation */
  private isLastFrame(): boolean {
    if (!this.currentTagData) return false;

    if (this.currentTagData.direction === 'backward') {
      return this.currentFrameIndex <= this.currentTagData.from;
    } else {
      return this.currentFrameIndex >= this.currentTagData.to;
    }
  }
}