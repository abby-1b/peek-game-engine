
export interface FrameData {
  x: number, y: number, w: number, h: number,
  offsetX: number, offsetY: number, duration: number
}
export interface TagData {
  from: number,
  to: number,
  direction: 'forward' | 'backward',
  repetitions: number,
}

interface AsepriteData {
  frames: Array<{
    frame: { x: number, y: number, w: number, h: number },
    spriteSourceSize: { x: number, y: number },
    duration: number,
    sourceSize: { w: number, h: number }
  }>,
  meta: { frameTags: Array<{ name: string } & TagData> }
}


/**
 * A class that handles texture animations
 */
export class AnimationData {
  private frameData: FrameData[] = [];
  private tags: Map<string, TagData> = new Map();

  public frameWidth: number = 0;
  public frameHeight: number = 0;

  /** Use `TextureAnimation.preload(path)` instead of this constructor */
  private constructor() {}

  /** Preloads a TextureAnimation from an Aseprite JSON file */
  public static async preloadAseprite(path: string): Promise<AnimationData> {
    const animation = new AnimationData();
    const asepriteData: AsepriteData = await fetch(path).then(r => r.json());
    for (let i = 0; i in asepriteData.frames; i++) {
      const frame = asepriteData.frames[i];
      animation.frameData.push({
        x: frame.frame.x,
        y: frame.frame.y,
        w: frame.frame.w,
        h: frame.frame.h,
        offsetX: frame.spriteSourceSize.x,
        offsetY: frame.spriteSourceSize.y,
        duration: frame.duration,
      });
    }
    for (const tag of asepriteData.meta.frameTags) {
      animation.tags.set(tag.name, {
        from: tag.from,
        to: tag.to,
        direction: tag.direction,
        repetitions: parseInt('' + (tag.repetitions ?? -1))
      });
    }
    animation.frameWidth = asepriteData.frames[0].sourceSize.w;
    animation.frameHeight = asepriteData.frames[0].sourceSize.h;
    return animation;
  }

  /** Creates AnimationData with no tags */
  public static async separateFrames(
    frameWidth: number, frameHeight: number,
    frameCount: number, frameDuration: number = 16.6666
  ): Promise<AnimationData> {
    const animation = new AnimationData();
    for (let i = 0; i < frameCount; i++) {
      animation.frameData.push({
        x: frameWidth * i,
        y: 0,
        w: frameWidth,
        h: frameHeight,
        offsetX: 0,
        offsetY: 0,
        duration: frameDuration,
      });
    }
    animation.frameWidth = frameWidth;
    animation.frameHeight = frameHeight;
    return animation;
  }

  /** Gets the data for a specific tag */
  public getTagData(tag: string): TagData {
    return this.tags.get(tag)!;
  }

  /** Gets the data for a specific frame in a tag */
  public getFrameData(frame: number): FrameData {
    return this.frameData[frame];
  }

  /** Gets a placeholder frame data (first frame) */
  public placeholderFrameData() {
    return this.frameData[0] ?? {
      x: 0, y: 0, w: 0, h: 0,
      offsetX: 0, offsetY: 0, duration: 100
    };
  }
}
