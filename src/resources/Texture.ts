import { Peek } from '../peek';
import { Color } from './Color';

const ATLAS_STARTUP_SIZE = 32;

const ATLAS_CLEANUP_MAX_TIME_MS = 0.5;

/** A position within the atlas. In the form X, Y */
type AtlasPos = [number, number];

/** A rect that references the atlas */
interface AtlasRect {
  x: number,
  y: number,
  w: number,
  h: number,
}

const enum AtlasTouch {
  X,
  Y
}

/** A texture atlas holds sets of textures. */
class TextureAtlas {
  /** The atlas itself! */
  public static atlasCanvas = new OffscreenCanvas(
    ATLAS_STARTUP_SIZE, ATLAS_STARTUP_SIZE
  );
  private static atlas: OffscreenCanvasRenderingContext2D;

  /**
   * A list of free rectangles within the atlas. This list should be kept tidy
   * by the `cleanup` function, and should (mostly) have rects sorted with
   * their top-left corner from top-left (first) to bottom-right (last). This
   * isn't guaranteed to be the case at all times, though.
   */
  private static freeRects: AtlasRect[] = [
    { x: 0, y: 0, w: ATLAS_STARTUP_SIZE, h: ATLAS_STARTUP_SIZE }
  ];

  /**
   * A list of used rectangles within the atlas. Used to help with `cleanup` and
   * as a lookup of how much space a texture takes up given its position.
   */
  private static usedRects: AtlasRect[] = [];

  /**
   * An index into the freeRects array. Used to distribute cleanup across
   * multiple frames.
   */
  private static cleanupIndex: number = 0;

  /** The last frame in which the atlas swapped (cleanup) */
  public static lastSwapFrame: number = 0;

  /** Static init! */
  static {
    this.atlas = this.atlasCanvas.getContext('2d')!;
  }

  /** Gets a rectangle within the atlas that equals the requested space. */
  public static requestSize(width: number, height: number): AtlasRect {
    // Find a free rectangle that fits this size
    for (let i = 0; i < this.freeRects.length; i++) {
      const rect = this.freeRects[i]; // Get the rect
      if (rect.w >= width && rect.h >= height) {
        // Found a suitable rectangle!
        const retRect: AtlasRect = {
          x: rect.x, y: rect.y,
          w: width, h: height
        };

        // Get the new split rectangles
        const newRects = this.remainingSpaceRects(rect, width, height);

        // Add the free rectangles to the array, replacing the old once.
        // This is done as a replace to keep the array better sorted.
        this.freeRects.splice(i, 1, ...newRects);

        // Add the rect to the used rects!
        this.usedRects.push(retRect);

        return retRect;
      }
    }

    // There were no free rects! Figure out how many times we'd have
    // To double The atlas' size for it to fit the texture...
    const doubleTimes = Math.ceil(Math.log2(
      (this.atlasCanvas.width + width) / this.atlasCanvas.width
    ));

    // Grow the atlas
    this.grow(
      this.atlasCanvas.width * (2 ** doubleTimes),
      this.atlasCanvas.height * (2 ** doubleTimes),
    );

    // Re-request size, but with the newly freed space!
    return this.requestSize(width, height);
  }

  /**
   * Grows the atlas, making space for new textures. This function automatically
   * appends the newly freed rects!
   */
  private static grow(newWidth: number, newHeight: number) {
    // Store the old size
    const oldWidth = this.atlasCanvas.width;
    const oldHeight = this.atlasCanvas.height;

    // Copy the atlas data. This can potentially be optimized, as `getImageData`
    // IS objectively slower than `drawImage` (due to GPU->CPU data passing).
    const oldData = this.atlas.getImageData(
      0, 0,
      this.atlasCanvas.width, this.atlasCanvas.height
    );

    // Change the size
    this.atlasCanvas.width = newWidth;
    this.atlasCanvas.height = newHeight;

    // Place the data back
    this.atlas.putImageData(oldData, 0, 0);

    // Add the free rects
    this.freeRects.push(...this.remainingSpaceRects(
      { x: 0, y: 0, w: newWidth, h: newHeight },
      oldWidth, oldHeight
    ));
  }

  /**
   * Removes an area from the top-left of a rect, returning a set of
   * rectangles that remain fill the remaining space.
   */
  private static remainingSpaceRects(
    areaRect: AtlasRect,
    removeWidth: number,
    removeHeight: number,
  ): AtlasRect[] {
    if (removeWidth == areaRect.w) {
      if (removeHeight == areaRect.h) {
        // If both are equal, we have a perfect match (no remaining space)
        return [];
      }

      // The width touches the left edge! Return the bottom rect
      return [{
        x: areaRect.x,
        y: areaRect.y + removeHeight,
        w: removeWidth,
        h: areaRect.h - removeHeight,
      }];
    } else if (removeHeight == areaRect.h) {
      // The height touches the bottom edge! Return the right-side rect
      return [{
        x: areaRect.x + removeWidth,
        y: areaRect.y,
        w: areaRect.w - removeWidth,
        h: removeHeight,
      }];
    } else {
      // It doesn't touch! Check which two rects fill the space more evenly

      // Arrangement #1 (width / height)
      const a1: [number, number][] = [
        [ areaRect.w - removeWidth, areaRect.h ],
        [ removeWidth, areaRect.h - removeHeight ],
      ];
      
      // Arrangement #2
      const a2: [number, number][] = [
        [ areaRect.w, areaRect.h - removeHeight ],
        [ areaRect.w - removeWidth, removeHeight ],
      ];

      // Aspect ratio #1
      let ar1a = a1[0][0] / a1[0][1];
      if (ar1a < 1) ar1a = 1 / ar1a;
      let ar1b = a1[1][0] / a1[1][1];
      if (ar1b < 1) ar1b = 1 / ar1b;
      
      // Aspect ratio #2
      let ar2a = a1[0][0] / a1[0][1];
      if (ar2a < 1) ar2a = 1 / ar2a;
      let ar2b = a1[1][0] / a1[1][1];
      if (ar2b < 1) ar2b = 1 / ar2b;

      // Return the ones with closest aspect ratios
      if (Math.abs(ar1a - ar1b) < Math.abs(ar2a - ar2b)) {
        return [
          {
            x: areaRect.x + removeWidth, y: areaRect.y,
            w: a1[0][0], h: a1[0][1]
          },
          {
            x: areaRect.x, y: areaRect.y + removeHeight,
            w: a1[1][0], h: a1[1][1]
          },
        ];
      } else {
        return [
          {
            x: areaRect.x, y: areaRect.y + removeHeight,
            w: a2[0][0], h: a2[0][1]
          },
          {
            x: areaRect.x + removeWidth, y: areaRect.y,
            w: a2[1][0], h: a2[1][1]
          },
        ];
      }
    }
  }

  /** Frees a position within the atlas, allowing it to be overwritten. */
  public static freePos(pos: AtlasPos) {
    for (let i = 0; i < this.usedRects.length; i++) {
      const rect = this.usedRects[i];
      if (rect.x == pos[0] && rect.y == pos[1]) {
        // Found the rect!
        this.freeRects.push(rect); // Add it to the free rects
        this.usedRects.splice(i, 1); // Remove it from the used rects
      }
    }
  }

  /** Cleans up the atlas! */
  public static cleanup() {

    const startTime = performance.now(); // Track when we start
    let didModify = false;

    // Make sure the cleanup index is valid.
    if (this.cleanupIndex <= 0) {
      // Wrap around back to the top
      this.cleanupIndex = this.freeRects.length - 2;
    } else {
      // Make sure it's less than the length (in case rects were used up)
      this.cleanupIndex = Math.min(
        this.cleanupIndex,
        this.freeRects.length - 2
      );
    }

    for (; this.cleanupIndex >= 0; this.cleanupIndex--) {
      if (performance.now() - startTime > ATLAS_CLEANUP_MAX_TIME_MS) {
        // We exceeded the max time, so stop!
        break;
      }

      // Get this rect
      const ra = this.freeRects[this.cleanupIndex];

      // Try merging
      for (let si = this.cleanupIndex + 1; si < this.freeRects.length; si++) {
        const rb = this.freeRects[si];
        let rbRemoved = false;

        // Full merges (two corners touching)
        if (
          ra.x == rb.x && // Left side
          ra.w == rb.w    // Right side
        ) {
          if (ra.y + ra.h == rb.y) {
            // `ra` on top of `rb`
            ra.h += rb.h;
            rbRemoved = true;
          } else if (ra.y == rb.y + rb.h) {
            // `rb` on top of `ra`
            ra.y = rb.y;
            ra.h += rb.h;
            rbRemoved = true;
          }
        } else if (
          ra.y == rb.y && // Top side
          ra.h == rb.h    // Bottom side
        ) {
          if (ra.x + ra.w == rb.x) {
            // `ra` left of `rb`
            ra.w += rb.w;
            rbRemoved = true;
          } else if (ra.x == rb.x + rb.w) {
            // `rb` left of `ra`
            ra.x = rb.x;
            ra.w += rb.w;
            rbRemoved = true;
          }
        }

        else {
          // Single-edge flips (one corner touching, no removes)

          if (
            (ra.y + ra.h == rb.y || ra.y == rb.y + rb.h) &&
            (ra.x == rb.x || ra.x + ra.w == rb.x + rb.w)
          ) {
            this.tryFlipRects(ra, rb, AtlasTouch.Y);
          } else if (
            (ra.x + ra.w == rb.x || ra.x == rb.x + rb.w) &&
            ((ra.y == rb.y || ra.y + ra.h == rb.y + rb.h))
          ) {
            this.tryFlipRects(ra, rb, AtlasTouch.X);
          }

        }

        // Remove `rb`
        if (rbRemoved) {
          didModify = true;
          this.freeRects.splice(si, 1);
        }

      }

      // Sort (bubble)
      const rb = this.freeRects[this.cleanupIndex + 1];
      if (ra && rb && rb.x + rb.y < ra.x + ra.y) {
        // If the further-ahead rectangle is closer to (0, 0), swap it
        didModify = true;
        [
          this.freeRects[this.cleanupIndex],
          this.freeRects[this.cleanupIndex + 1]
        ] = [
          this.freeRects[this.cleanupIndex + 1],
          this.freeRects[this.cleanupIndex]
        ];
      }
    }

    if (didModify) {
      this.lastSwapFrame = Peek.frameCount;
    }

  }

  /**
   * Tries flipping two atlas rects, attempting to get their aspect ratios
   * closer to 1:1 (closer to a square)
   */
  private static tryFlipRects(
    ra: AtlasRect,
    rb: AtlasRect,
    touchSide: AtlasTouch
  ) {
    // Swap so `ra` is top-left
    if (
      (touchSide == AtlasTouch.X && ra.x > rb.x) ||
      (touchSide == AtlasTouch.Y && ra.y > rb.y)
    ) { [ra, rb] = [rb, ra]; }

    if (touchSide == AtlasTouch.X) {
      // Touching on X-facing edge, `ra` on left
      if (ra.y == rb.y) {
        // Top edge aligned
        
        if (ra.h > rb.h) {
          if (ratioIsBetter(ra, 0, -rb.h, rb, ra.w, 0)) {
            // #1
            ra.y += rb.h;
            ra.h -= rb.h;
            rb.x -= ra.w;
            rb.w += ra.w;
          }
        } else {
          if (ratioIsBetter(ra, rb.w, 0, rb, 0, -ra.h)) {
            // #2
            ra.w += rb.w;
            rb.y += ra.h;
            rb.h -= ra.h;
          }
        }

      } else {
        // Bottom edge aligned

        if (ra.h > rb.h) {
          if (ratioIsBetter(ra, 0, -rb.h, rb, ra.w, 0)) {
            // #1
            rb.x = ra.x;
            rb.w += ra.w;
            ra.h -= rb.h;
          }
        } else {
          if (ratioIsBetter(ra, rb.w, 0, rb, 0, -ra.h)) {
            // #2
            ra.w += rb.w;
            rb.h -= ra.h;
          }
        }

      }
    } else {
      // Touching on Y-facing edge, `ra` on top
      if (ra.x == rb.x) {
        // Left edge aligned

        if (ra.w > rb.w) {
          if (ratioIsBetter(ra, -rb.w, 0, rb, 0, ra.h)) {
            // #1
            rb.y = ra.y;
            rb.h += ra.h;
            ra.x += rb.w;
            ra.w -= rb.w;
          }
        } else {
          if (ratioIsBetter(ra, 0, rb.h, rb, -ra.w, 0)) {
            // #2
            ra.h += rb.h;
            rb.x += ra.w;
            rb.w -= ra.w;
          }
        }

      } else {
        // Right edge aligned

        if (ra.w > rb.w) {
          if (ratioIsBetter(ra, -rb.w, 0, rb, 0, ra.h)) {
            // #1
            rb.y = ra.y;
            rb.h += ra.h;
            ra.w -= rb.w;
          }
        } else {
          if (ratioIsBetter(ra, 0, rb.h, rb, -ra.w, 0)) {
            // #2
            rb.w -= ra.w;
            ra.h += rb.h;
          }
        }

      }
    }
  }

  // PUBLIC METHODS

  /** Puts an image into the atlas at a certain position */
  public static loadImage(x: number, y: number, image: HTMLImageElement) {
    this.atlas.drawImage(image, x, y);
  }

  /** Sets a single pixel within the atlas. This is a full replace! */
  public static setPixel(x: number, y: number, color: Color) {
    this.atlas.clearRect(x, y, 1, 1);
    this.atlas.fillStyle = color.fillStyle();
    this.atlas.fillRect(x, y, 1, 1);
  }

  /** Multiplies the alpha of a single pixel. Takes alpha as 0-255 */
  public static fadePixel(x: number, y: number, alpha: number) {
    this.atlas.save();

    this.atlas.beginPath();
    this.atlas.rect(x, y, 1, 1);
    this.atlas.clip();

    this.atlas.globalCompositeOperation = 'destination-in';
    this.atlas.globalAlpha = alpha / 255;
    this.atlas.fillStyle = 'white';
    this.atlas.fillRect(x, y, 1, 1);

    this.atlas.restore();
  }
}

/** Checks if a size change makes for a better (more square) ratio */
function ratioIsBetter(
  ra: AtlasRect, aw: number, ah: number,
  rb: AtlasRect, bw: number, bh: number,
): boolean {
  let ca = ra.w / ra.h;
  if (ca > 1) ca = 1 / ca;
  let cb = rb.w / rb.h;
  if (cb > 1) cb = 1 / cb;

  let pa = (ra.w + aw) / (ra.h + ah);
  if (pa > 1) pa = 1 / pa;
  let pb = (rb.w + bw) / (rb.h + bh);
  if (pb > 1) pb = 1 / pb;

  return Peek.frameCount % 60 < 2 ? (pa + pb < ca + cb) : (pa + pb > ca + cb);
}

/** A texture is an index into the texture atlas. */
export class Texture {
  private static freeListener = new FinalizationRegistry((pos: AtlasPos) => {
    // This runs when a texture is garbage collected!
    console.log(`Texture at (${pos[0]}, ${pos[1]}) was freed!`);
    TextureAtlas.freePos(pos);
  });

  // Size of this texture
  public readonly width: number;
  public readonly height: number;

  // Atlas position
  private atlasX: number;
  private atlasY: number;

  /**
   * Makes a new texture object, which points to the texture atlas.
   * If you want an empty texture that will be allocated later,
   * pass -1 as the width and height.
   */
  public constructor(width: number, height: number) {
    if (width == -1) {
      // Just make the object, without allocating space on the atlas
      this.width = -1;
      this.height = -1;
      this.atlasX = -1;
      this.atlasY = -1;
    } else {
      // Get our atlas position
      const atlasRect = TextureAtlas.requestSize(width, height);
      this.atlasX = atlasRect.x;
      this.atlasY = atlasRect.y;
      
      // Add ourselves to the garbage collection listener
      Texture.freeListener.register(this, [ this.atlasX, this.atlasY ]);

      // Set our width and height
      this.width = width;
      this.height = height;
    }
  }

  /** Loads a texture from the file manager, given a path */
  public static load(
    path: string,
    callback?: (success: boolean) => void): Texture {
    // Make the texture
    const tex = new Texture(-1, -1);

    // Load the image (async)
    const img = new Image();
    img.onload = () => {
      // Set the texture's dimensions (readonly override)
      (tex as { width: number }).width = img.width;
      (tex as { height: number }).height = img.width;

      // Set the texture's atlas position
      const atlasRect = TextureAtlas.requestSize(img.width, img.width);
      tex.atlasX = atlasRect.x;
      tex.atlasY = atlasRect.y;

      // Put the image on the atlas
      TextureAtlas.loadImage(atlasRect.x, atlasRect.y, img);

      // Run the callback (if any)
      if (callback) callback(true);
    };
    if (callback) img.onerror = () => { callback(false); }; // Error
    img.src = path; // Load!

    // Return the texture
    return tex;
  }

  /**
   * Preloads a texture from the file manager, given a path
   */
  public static async preload(path: string): Promise<Texture> {
    return new Promise((resolve, reject) => {
      const tex = this.load(path, s => s
        ? resolve(tex)
        : reject(tex)
      );
    });
  }

  /** Sets a pixel within the texture */
  public setPixel(x: number, y: number, color: Color) {
    // TODO: inject debugger logic to check bounds!
    TextureAtlas.setPixel(x + this.atlasX, y + this.atlasY, color);
  }

  /** Multiplies the alpha of a single pixel. Takes alpha as 0-255 */
  public fadePixel(x: number, y: number, alpha: number) {
    // TODO: inject debugger logic to check bounds!
    TextureAtlas.fadePixel(x + this.atlasX, y + this.atlasY, alpha);
  }

  /** Masks a transparent circle on this texture. */
  public maskCircle(antialias: boolean = false, feather: number = 1): this {
    // Calculate the mask...
    const cx = this.width / 2 + 0.25;
    const cy = this.height / 2 + 0.25;
    const blurRadius = (antialias ? (1 - feather / cx) : 1) ** 2;
    const m = 1 / (1 - blurRadius);

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const d = ((x + 0.5 - cx) / cx) ** 2 + ((y + 0.5 - cy) / cy) ** 2;
        if (d > blurRadius) {
          if (antialias) {
            this.fadePixel(
              x, y,
              Math.max(0, 1 - (d - blurRadius) * m) * 255
            );
          } else {
            this.setPixel(x, y, Color.TRANSPARENT);
          }
        }
      }
    }

    return this;
  }

  /** Draws this texture to a specific position */
  public draw(x: number, y: number) {
    if (this.width == -1) return;
    Peek.ctx.drawImage(
      TextureAtlas.atlasCanvas,
      this.atlasX, this.atlasY, this.width, this.height,
      x, y, this.width, this.height
    );
  }
}

/**
 * Cleans up the texture atlas! This is ran by `Peek.frame()` every frame, and
 * ensures that it will finish quickly, even when the texture atlas is badly
 * fragmented. Will take at most `ATLAS_CLEANUP_MAX_TIME_MS`.
 */
export function atlasCleanup() {
  TextureAtlas.cleanup();
}

/* DEBUG
window.Texture = Texture;
window.TextureAtlas = TextureAtlas;
export const freeRects = TextureAtlas.freeRects;
export const usedRects = TextureAtlas.usedRects;
function situation(
  count: number,
  keep: number,
  tileSize: number,
  tileRange: [number, number],
): AtlasRect[] {
  const positions: AtlasRect[] = [];
  for (let i = 0; i < count; i++) {
    const pos = TextureAtlas.requestSize(
      tileSize * (tileRange[0] + ~~(Math.random()*(tileRange[1]-tileRange[0]))),
      tileSize * (tileRange[1] + ~~(Math.random()*(tileRange[1]-tileRange[0]))),
    );
    (pos as unknown as {idx: number}).idx = Math.random();
    positions.push(pos);
  }

  // Shuffle positions!
  positions.sort((a, b) => {
    return (a as unknown as {idx: number}).idx
      - (b as unknown as {idx: number}).idx;
  });
  
  for (let i = 0; i < count - keep; i++) {
    TextureAtlas.freePos([ positions[i].x, positions[i].y ]);
  }

  // Console.log('Atlas size:', TextureAtlas.atlasCanvas.width);
  return positions.slice(count - keep);
}
window.situation = situation;

*/