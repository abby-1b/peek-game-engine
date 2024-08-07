import { Peek } from '../peek';
import { BlendMode } from '../util/BlendMode';
import { Drawable } from '../util/Drawable';
import { Color } from './Color';

const ATLAS_STARTUP_SIZE = 32;

const ATLAS_CLEANUP_MAX_TIME_MS = 0.5;

const TEXTURE_OPTIMIZE_CHANCE = 0.01;

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
class TextureAtlasMain {
  /** The atlas itself! */
  public static atlasCanvas: OffscreenCanvas | HTMLCanvasElement;
  private static atlas:
    (OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D) & {
      webkitImageSmoothingEnabled?: boolean,
      mozImageSmoothingEnabled   ?: boolean,
      imageSmoothingEnabled      ?: boolean,
    };
  private static singlePixelImageData: ImageData;

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
    this.atlasCanvas = new OffscreenCanvas(
      ATLAS_STARTUP_SIZE, ATLAS_STARTUP_SIZE
    );
    this.atlas = this.atlasCanvas.getContext('2d', {
      /*
      This property isn't set to true because *most* operations aren't reads.
      Setting this to true keeps a copy of the texture on the CPU, which
      could be slow.
      */
      // willReadFrequently: true
    })!;
    this.atlas.webkitImageSmoothingEnabled = false;
    this.atlas.mozImageSmoothingEnabled = false;
    this.atlas.imageSmoothingEnabled = false;
    this.atlas.imageSmoothingQuality = 'low';
    this.singlePixelImageData = this.atlas.createImageData(1, 1);
  }

  /** Gets a rectangle within the atlas that equals the requested space. */
  public static requestSize(width: number, height: number): AtlasRect;
  
  /**
   * Gets a rectangle within the atlas that equals the requested space. If no
   * rectangle is found that is more optimized than the given level, undefined
   * is returned.
   */
  public static requestSize(
    width: number, height: number,
    moreOptimizedThan: number
  ): AtlasRect | undefined;

  /** Gets a rectangle within the atlas that equals the requested space. */
  public static requestSize(
    width: number, height: number,
    moreOptimizedThan?: number
  ) {
    // const cleanupTimes = ~~(this.freeRects.length * 0.8);
    // console.log(cleanupTimes);
    // for (let i = 0; i < cleanupTimes; i++) {
    //   this.cleanup();
    // }

    // Find a free rectangle that fits this size
    for (let i = 0; i < this.freeRects.length; i++) {
      const rect = this.freeRects[i]; // Get the rect
      if (rect.w >= width && rect.h >= height) {
        if (moreOptimizedThan !== undefined) {
          const optimization = this.positionScore(rect.x, rect.y);
          if (optimization >= moreOptimizedThan) continue;
        }

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

        this.sortRects();

        // Add the rect to the used rects!
        this.usedRects.push(retRect);

        return retRect;
      }
    }

    if (moreOptimizedThan !== undefined) {
      return undefined;
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

  /** How 'good' a position on the atlas is */
  public static positionScore(x: number, y: number) {
    return Math.max(x, y);
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
    }

    if (didModify) {
      this.sortRects();
      this.lastSwapFrame = Peek.frameCount;
    }

  }

  /** Sorts the `freeRects` array completely */
  private static sortRects() {
    this.freeRects.sort(
      (a, b) => this.positionScore(a.x, a.y) - this.positionScore(b.x, b.y)
    );
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

  /** Sets the stroke and fill color of the atlas */
  public static atlasColor(color: Color) {
    this.atlas.strokeStyle = this.atlas.fillStyle = color.fillStyle();
  }

  /** Sets the blend mode on the atlas. Make sure to set it back to normal! */
  public static atlasBlendMode(blendMode: BlendMode) {
    // TODO: this
    this.atlas.globalCompositeOperation = blendMode;
  }

  /** Puts an image into the atlas at a certain position */
  public static putImage(
    x: number, y: number,
    image: CanvasImageSource = this.atlasCanvas
  ) {
    this.atlas.drawImage(image, x, y);
  }

  /** Puts a portion of an image into the atlas at a certain position */
  public static putImagePortion(
    sourceX: number, sourceY: number,
    sourceW: number, sourceH: number,
    destinationX: number, destinationY: number,
    image: CanvasImageSource = this.atlasCanvas
  ) {
    this.atlas.drawImage(
      image,
      sourceX, sourceY, sourceW, sourceH,
      destinationX, destinationY, sourceW, sourceH
    );
  }

  /** Puts a portion of an image into the atlas at a given position and size. */
  public static putImagePortionScaled(
    sourceX: number, sourceY: number,
    sourceW: number, sourceH: number,
    destinationX: number, destinationY: number,
    destinationW: number, destinationH: number,
    image: CanvasImageSource = this.atlasCanvas
  ) {
    this.atlas.drawImage(
      image,
      sourceX, sourceY, sourceW, sourceH,
      destinationX, destinationY, destinationW, destinationH
    );
  }

  /** Draws an image (rotated around its center) inside a given texture */
  public static drawRotated(
    sourceX: number, sourceY: number,
    sourceW: number, sourceH: number,
    destinationX: number, destinationY: number,
    destinationW: number, destinationH: number,
    angle: number
  ) {
    this.atlas.webkitImageSmoothingEnabled = false;
    this.atlas.mozImageSmoothingEnabled = false;
    this.atlas.imageSmoothingEnabled = false;
    
    this.atlas.save();
    this.atlas.translate(
      Math.round(destinationX + destinationW / 2),
      Math.round(destinationY + destinationH / 2)
    );

    const boundA = 0.1;
    const boundS = boundA * 2;

    this.atlas.beginPath();
    this.atlas.rect(
      -destinationW / 2 + boundA,
      -destinationH / 2 + boundA,
      destinationW - boundS, destinationH - boundS
    );
    this.atlas.clip();

    this.atlas.rotate(-angle);
    this.atlas.drawImage(
      this.atlasCanvas,
      sourceX + boundA, sourceY + boundA, sourceW - boundS, sourceH - boundS,
      Math.round(-sourceW / 2), Math.round(-sourceH / 2), sourceW, sourceH,
    );
    this.atlas.restore();
  }

  /** Sets a single pixel within the atlas. This is a full replace! */
  public static setPixel(x: number, y: number, color: Color) {
    this.atlas.clearRect(~~x, ~~y, 1, 1);
    this.atlas.fillStyle = color.fillStyle();
    this.atlas.fillRect(~~x, ~~y, 1, 1);
  }
  /** Sets a single pixel within the atlas. This is a full replace! */
  public static setPixelRaw(x: number, y: number, color: Uint8ClampedArray) {
    this.singlePixelImageData.data.set(color);
    this.atlas.putImageData(this.singlePixelImageData, x, y);
  }
  /** Puts a large chunk of image data in the atlas */
  public static putRawImageData(x: number, y: number, imageData: ImageData) {
    this.atlas.putImageData(imageData, x, y);
  }

  /** Gets a single pixel from within the atlas. */
  public static getPixel(x: number, y: number): Color {
    const data = this.atlas.getImageData(x, y, 1, 1).data;
    return new Color(data[0], data[1], data[2], data[3]);
  }
  /** Gets a single pixel from within the atlas. */
  public static getPixelRaw(x: number, y: number): Uint8ClampedArray {
    return this.atlas.getImageData(x, y, 1, 1).data;
  }
  /** Gets a large chunk of image data from within the atlas */
  public static getRawImageData(
    x: number, y: number,
    width: number, height: number
  ): ImageData {
    return this.atlas.getImageData(x, y, width, height);
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

  /** Draws a clear rectangle in the specified position */
  public static clearRect(x: number, y: number, w: number, h: number) {
    this.atlas.clearRect(x, y, w, h);
  }

  /** Draws a filled rectangle given the top left point, width, and height. */
  public static fillRect(x: number, y: number, width: number, height: number) {
    this.atlas.fillRect(x, y, width, height);
  }
  
  /** Draws a rectangle outline given the top left point, width, and height. */
  public static rect(x: number, y: number, width: number, height: number) {
    this.atlas.beginPath();
    this.atlas.rect(
      Math.floor(x) + 0.5,
      Math.floor(y) + 0.5,
      width - 1,
      height - 1
    );
    this.atlas.stroke();
  }

  /** Draws a centered circle at the given position. */
  public static circle(x: number, y: number, radius: number) {
    x = Math.floor(x);
    y = Math.floor(y);
    radius = ~~radius;

    let last = radius - 1;
    for (let p = 0; p < radius; p++) {
      const f = p / (radius - 1);
      const h = ~~(Math.sqrt(1 - f ** 2) * radius);
      const colHeight = (last - h) || 1;

      this.fillRect(
        x + p,
        y + h,
        1, colHeight
      );
      this.fillRect(
        x + p,
        y - h,
        1, -colHeight
      );
      this.fillRect(
        x - p,
        y + h,
        1, colHeight
      );
      this.fillRect(
        x - p,
        y - h,
        1, -colHeight
      );

      last = h;
    }
  }

  /**
   * Draws a line using EFLA Variation D
   * 
   * Source: http://www.edepot.com/lined.html
   * 
   * @param x1 The line's start X
   * @param y1 The line's start Y
   * @param x2 The line's end X
   * @param y2 The line's end Y
   */
  public static line(
    x1: number, y1: number,
    x2: number, y2: number
  ) {
    x1 = ~~x1;
    x2 = ~~x2;
    y1 = ~~y1;
    y2 = ~~y2;

    let shortLen = y2 - y1;
    let longLen = x2 - x1;

    let yLonger: boolean;
    if (Math.abs(shortLen) > Math.abs(longLen)) {
      const swap = shortLen;
      shortLen = longLen;
      longLen = swap;
      yLonger = true;
    } else {
      yLonger = false;
    }

    const endVal = longLen;

    let incrementVal: number;
    if (longLen < 0) {
      incrementVal = -1;
      longLen = -longLen;
    } else {
      incrementVal = 1;
    }

    const decInc: number = longLen == 0
      ? 0
      : Math.floor((shortLen << 16) / longLen);

    let j = 0;
    if (yLonger) {
      for (let i = 0; i !== endVal; i += incrementVal) {
        this.atlas.fillRect(x1 + (j >> 16), y1 + i, 1, 1);
        j += decInc;
      }
    } else {
      for (let i = 0; i !== endVal; i += incrementVal) {
        this.atlas.fillRect(x1 + i, y1 + (j >> 16), 1, 1);
        j += decInc;
      }
    }
  }

  /** Saves the state of the atlas (canvas drawing operation) */
  public static stateSave() { this.atlas.save(); }
  /** Restores the state of the atlas (canvas drawing operation) */
  public static stateRestore() { this.atlas.restore(); }

  /** Starts a clip (mask) */
  public static clip(x: number, y: number, w: number, h: number) {
    this.atlas.beginPath();
    this.atlas.rect(x, y, w, h);
    this.atlas.clip();
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
const TextureAtlas: (typeof TextureAtlasMain) & Drawable = TextureAtlasMain;

/**
 * A texture that can be loaded, unloaded, drawn on... pretty much anything!
 * 
 * Since all textures exist within the texture atlas, each texture is
 * responsible for only using/modifying its portion of the atlas.
 */
export class Texture implements Drawable {
  private static freeListener = new FinalizationRegistry((pos: AtlasPos) => {
    // This runs when a texture is garbage collected!
    console.log(`Texture at (${pos[0]}, ${pos[1]}) was freed!`);
    TextureAtlas.freePos(pos);
  });
  private static currTextureID = 0;
  public readonly textureId: number;

  /** The width of this texture */
  private width!: number;
  /** The height of this texture */
  private height!: number;

  /** Gets the width of this texture */
  public getWidth() { return this.width; }
  /** Gets the height of this texture */
  public getHeight() { return this.height; }

  // Atlas position
  private atlasX!: number;
  private atlasY!: number;

  /** Gets the atlas X position of this texture */
  public getAtlasX() { return this.atlasX; }
  /** Gets the atlas Y position of this texture */
  public getAtlasY() { return this.atlasY; }


  /**
   * Makes a new texture object, which points to the texture atlas.
   * 
   * If you want an empty texture that will be allocated later, pass -1 as
   * the width and height. Empty textures don't take up space on the atlas.
   */
  public constructor(width: number, height: number) {
    this.textureId = Texture.currTextureID++;
    if (width == -1 || height == -1) {
      // Just make the object, without allocating space on the atlas
      this.width = -1;
      this.height = -1;
      this.atlasX = -1;
      this.atlasY = -1;
    } else {
      // The size is already provided
      this.setSize(width, height);
    }
  }

  /** Sets the size of this texture, making sure it gets freed after its use. */
  private setSize(width: number, height: number) {
    // TODO: debugger (ensure `this.width` and `this.height` are -1)
    this.width  = width;
    this.height = height;

    // Set the texture's atlas position
    const atlasRect = TextureAtlas.requestSize(width, height);
    this.atlasX = atlasRect.x;
    this.atlasY = atlasRect.y;

    // Add this texture to the garbage collection listener
    Texture.freeListener.register(this, [ this.atlasX, this.atlasY ], this);
  }

  /** Manually frees this texture. This is kept private to avoid issues! */
  private free() {
    Texture.freeListener.unregister(this);
    TextureAtlas.freePos([ this.atlasX, this.atlasY ]);
  }

  /** Swaps the texture data of two textures, including their GC data. */
  private static swapTexturePointers(a: Texture, b: Texture) {
    this.freeListener.unregister(a);
    this.freeListener.unregister(b);
    [
      b.atlasX, a.atlasX,
      b.atlasY, a.atlasY,
      b.width,
      a.width,
      b.height,
      a.height,
    ] = [
      a.atlasX, b.atlasX,
      a.atlasY, b.atlasY,
      a.width, b.width,
      a.height, b.height,
    ];
    this.freeListener.register(a, [ a.atlasX, a.atlasY ], a);
    this.freeListener.register(b, [ b.atlasX, b.atlasY ], b);
  }

  /** Loads a texture from the file manager, given a path */
  private static load(
    path: string,
    callback?: (success: boolean) => void
  ): Texture {
    // Make the texture
    const tex = new Texture(-1, -1);

    // Load the image (async)
    const img = new Image();
    img.onload = () => {
      // Initialize the texture
      tex.setSize(img.width, img.height);

      // Put the image on the atlas
      TextureAtlas.putImage(tex.atlasX, tex.atlasY, img);

      // Run the callback (if any)
      if (callback) callback(true);
    };
    if (callback) img.onerror = () => { callback(false); }; // Error
    img.src = path; // Load!

    // Return the texture
    return tex;
  }

  /** Preloads a texture from the file manager, given a path */
  public static async preload(path: string): Promise<Texture> {
    return new Promise((resolve, reject) => {
      const tex = this.load(path, s => s
        ? resolve(tex)
        : reject(tex)
      );
    });
  }

  /**
   * Rotates a texture. Returns a copy of the
   * texture rotated to the specified angle.
   * @param texture The texture to rotate
   * @param angle The rotation angle (in radians)
   * @param keepSize Keeps the size constant
   */
  public static rotated(
    texture: Texture,
    angle: number,
    keepSize = false
  ): Texture {
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    const sourceW = texture.width;
    const sourceH = texture.height;

    const finalW = keepSize
      ? sourceW
      : Math.round(Math.abs(sourceH * s) + Math.abs(sourceW * c));
    const finalH = keepSize
      ? sourceH
      : Math.round(Math.abs(sourceH * c) + Math.abs(sourceW * s));

    // Create the new texture
    const out = new Texture(finalW, finalH);

    // Store imageData arrays (for faster reading & writing)
    const sourceData = TextureAtlas.getRawImageData(
      texture.atlasX, texture.atlasY,
      sourceW, sourceH
    ).data;
    const outImageData = new ImageData(finalW, finalH);
    const outPixels = outImageData.data;

    // Calculate center points
    const centerX = (sourceW - 0.5) / 2;
    const centerY = (sourceH - 0.5) / 2;
    const finalCenterX = (finalW - 1) / 2;
    const finalCenterY = (finalH - 1) / 2;

    for (let x = 0; x < finalW; x++) {
      for (let y = 0; y < finalH; y++) {
        // Translate target to source positions

        // Translate to origin
        const dx = x - finalCenterX;
        const dy = y - finalCenterY;

        // Rotate around center
        const rotatedX = c * dx - s * dy;
        const rotatedY = c * dy + s * dx;

        // Translate back and round to nearest pixel
        const sourceX = ~~(rotatedX + centerX);
        const sourceY = ~~(rotatedY + centerY);

        // Check if the source pixel is within bounds
        if (
          sourceX >= 0 && sourceX < sourceW &&
          sourceY >= 0 && sourceY < sourceH
        ) {
          // Put the source pixel in the destination texture
          const sourceIdx = (sourceX + sourceY * sourceW) * 4;
          outPixels[(x + y * finalW) * 4    ] = sourceData[sourceIdx    ];
          outPixels[(x + y * finalW) * 4 + 1] = sourceData[sourceIdx + 1];
          outPixels[(x + y * finalW) * 4 + 2] = sourceData[sourceIdx + 2];
          outPixels[(x + y * finalW) * 4 + 3] = sourceData[sourceIdx + 3];
        }
      }
    }

    TextureAtlas.putRawImageData(out.atlasX, out.atlasY, outImageData);
    return out;
  }

  /**
   * Applies a tint to a texture. Returns a copy of the
   * texture tinted with the specified color.
   * @param texture The texture to tint
   * @param color The color to multiply each pixel by
   * @returns The modified texture
   */
  public static tinted(
    texture: Texture,
    color: Color
  ) {
    const { width, height } = texture;

    // Create the new texture
    const out = new Texture(width, height);

    // Clip
    TextureAtlas.stateSave();
    TextureAtlas.clip(out.atlasX, out.atlasY, width, height);

    // Preserve color (no black/desaturated edges)
    TextureAtlas.atlasBlendMode(BlendMode.LUMINOSITY);
    TextureAtlas.putImagePortion(
      texture.atlasX, texture.atlasY, width, height,
      out.atlasX, out.atlasY
    );
    TextureAtlas.atlasBlendMode(BlendMode.COLOR);
    TextureAtlas.putImagePortion(
      texture.atlasX, texture.atlasY, width, height,
      out.atlasX, out.atlasY
    );

    // Actually apply tint
    TextureAtlas.atlasBlendMode(BlendMode.MULTIPLY);
    TextureAtlas.atlasColor(color);
    TextureAtlas.fillRect(out.atlasX, out.atlasY, width, height);

    // Re-gain alpha
    TextureAtlas.atlasBlendMode(BlendMode.DEST_IN);
    TextureAtlas.putImagePortion(
      texture.atlasX, texture.atlasY, width, height,
      out.atlasX, out.atlasY
    );
    // TextureAtlas.atlasBlendMode(BlendMode.NORMAL);

    TextureAtlas.stateRestore();

    return out;
  }

  /**
   * Resizes a texture. Returns a copy of the
   * texture resized to the new size.
   * @param texture The texture to resize
   * @param newWidth The new width of the texture
   * @param newHeight The new height of the texture
   * @returns The modified texture
   */
  public static resized(
    texture: Texture,
    newWidth: number,
    newHeight: number,
  ) {
    newWidth = ~~newWidth;
    newHeight = ~~newHeight;

    // Create the new texture
    const out = new Texture(newWidth, newHeight);
    
    // out.fill(Color.TRANSPARENT);
    // TextureAtlas.putImagePortionScaled(
    //   texture.atlasX, texture.atlasY,
    //   texture.width, texture.height,
    //   out.atlasX, out.atlasY,
    //   newWidth, newHeight
    // );
    // return out;

    // Store imageData arrays (for faster reading & writing)
    const sourceData = TextureAtlas.getRawImageData(
      texture.atlasX, texture.atlasY,
      texture.width, texture.height
    ).data;
    const outImageData = new ImageData(newWidth, newHeight);
    const outPixels = outImageData.data;

    const sourceW = texture.width;
    const sourceH = texture.height;
    const widthScale = sourceW / newWidth;
    const heightScale = sourceH / newHeight;

    for (let x = 0; x < newWidth; x++) {
      for (let y = 0; y < newHeight; y++) {

        const sourceX = ~~(x * widthScale);
        const sourceY = ~~(y * heightScale);

        // Put the source pixel in the destination texture
        const sourceIdx = (sourceX + sourceY * sourceW) * 4;
        outPixels[(x + y * newWidth) * 4    ] = sourceData[sourceIdx    ];
        outPixels[(x + y * newWidth) * 4 + 1] = sourceData[sourceIdx + 1];
        outPixels[(x + y * newWidth) * 4 + 2] = sourceData[sourceIdx + 2];
        outPixels[(x + y * newWidth) * 4 + 3] = sourceData[sourceIdx + 3];
      }
    }

    TextureAtlas.putRawImageData(out.atlasX, out.atlasY, outImageData);

    return out;
  }

  /**
   * Clones this texture, allocating it in a new spot in the texture atlas.
   * Modifying the clone will not modify the original, as it's a copy.
   */
  public clone() {
    const newTexture = new Texture(this.width, this.height);
    newTexture.fill(Color.TRANSPARENT);
    TextureAtlas.putImagePortion(
      this.atlasX, this.atlasY, this.width, this.height,
      newTexture.atlasX, newTexture.atlasY
    );
    return newTexture;
  }

  /** Fills this texture completely with the given color */
  public fill(color: Color) {
    TextureAtlas.clearRect(this.atlasX, this.atlasY, this.width, this.height);
    TextureAtlas.atlasColor(color);
    if (color.alpha != 0) {
      TextureAtlas.fillRect(this.atlasX, this.atlasY, this.width, this.height);
    }
  }

  /** Sets a pixel within the texture */
  public setPixel(x: number, y: number, color: Color) {
    TextureAtlas.setPixel(x + this.atlasX, y + this.atlasY, color);
  }
  /** Sets a pixel within the texture */
  public setPixelRaw(x: number, y: number, color: Uint8ClampedArray) {
    TextureAtlas.setPixelRaw(x + this.atlasX, y + this.atlasY, color);
  }

  /** Gets a pixel within the texture, returning its color */
  public getPixel(x: number, y: number): Color {
    return TextureAtlas.getPixel(x + this.atlasX, y + this.atlasY);
  }
  /** Gets a pixel within the texture, returning its color */
  public getPixelRaw(x: number, y: number): Uint8ClampedArray {
    return TextureAtlas.getPixelRaw(x + this.atlasX, y + this.atlasY);
  }

  /** Multiplies the alpha of a single pixel. Takes alpha as 0-255 */
  public fadePixel(x: number, y: number, alpha: number) {
    TextureAtlas.fadePixel(x + this.atlasX, y + this.atlasY, alpha);
  }

  /** Clears a portion of this texture */
  public clearRect(x: number, y: number, w: number, h: number) {
    // TODO: debugger hook (no need for clipping!)
    TextureAtlas.clearRect(
      x + this.atlasX, y + this.atlasY,
      w, h
    );
  }

  /** Draws a filled rectangle given the top left point, width, and height. */
  public fillRect(x: number, y: number, width: number, height: number) {
    // TODO: debugger hook
    TextureAtlas.fillRect(x + this.atlasX, y + this.atlasY, width, height);
  }
  
  /** Draws a rectangle outline given the top left point, width, and height. */
  public rect(x: number, y: number, width: number, height: number) {
    // TODO: debugger hook
    TextureAtlas.rect(
      x + this.atlasX, y + this.atlasY,
      width, height
    );
  }

  /** Draws a centered circle at the given position. */
  public circle(x: number, y: number, radius: number) {
    TextureAtlas.circle(this.atlasX + x, this.atlasY + y, radius);
  }

  /**
   * Draws a line using EFLA Variation D
   * 
   * Source: http://www.edepot.com/lined.html
   * 
   * @param x1 The line's start X
   * @param y1 The line's start Y
   * @param x2 The line's end X
   * @param y2 The line's end Y
   */
  public line(x1: number, y1: number, x2: number, y2: number) {
    x1 = ~~x1 + this.atlasX;
    x2 = ~~x2 + this.atlasX;
    y1 = ~~y1 + this.atlasY;
    y2 = ~~y2 + this.atlasY;

    let shortLen = y2 - y1;
    let longLen = x2 - x1;

    let yLonger: boolean;
    if (Math.abs(shortLen) > Math.abs(longLen)) {
      const swap = shortLen;
      shortLen = longLen;
      longLen = swap;
      yLonger = true;
    } else {
      yLonger = false;
    }

    const endVal = longLen;

    let incrementVal: number;
    if (longLen < 0) {
      incrementVal = -1;
      longLen = -longLen;
    } else {
      incrementVal = 1;
    }

    const decInc: number = longLen == 0
      ? 0
      : Math.floor((shortLen << 16) / longLen);

    let j = 0;
    if (yLonger) {
      for (let i = 0; i !== endVal; i += incrementVal) {
        TextureAtlas.fillRect(x1 + (j >> 16), y1 + i, 1, 1);
        j += decInc;
      }
    } else {
      for (let i = 0; i !== endVal; i += incrementVal) {
        TextureAtlas.fillRect(x1 + i, y1 + (j >> 16), 1, 1);
        j += decInc;
      }
    }
  }

  /** Masks a transparent circle on this texture. */
  public maskCircle(antialias: boolean = false, feather: number = 1): this {
    // Calculate the mask...
    const cx = this.width / 2;
    const cy = this.height / 2;
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

  /**
   * Applies a tint to this texture.
   * @param color The color to multiply each pixel by
   * @returns The modified texture
   */
  public tint(color: Color): this {
    const newTexture = Texture.tinted(this, color);
    Texture.swapTexturePointers(this, newTexture);
    newTexture.free();
    return this;
  }

  /**
   * Rotates this texture.
   * @param angle The angle to rotate the texture by
   * @param keepSize Keeps the size constant
   * @returns The modified texture
   */
  public rotate(angle: number, keepSize = false): this {
    const newTexture = Texture.rotated(this, angle, keepSize);
    Texture.swapTexturePointers(this, newTexture);
    newTexture.free();
    return this;
  }
  
  /**
   * Resizes this texture
   * @param newWidth The new width of the texture
   * @param newHeight The new height of the texture
   * @returns The modified texture
   */
  public resize(newWidth: number, newHeight: number): this {
    const newTexture = Texture.resized(this, newWidth, newHeight);
    Texture.swapTexturePointers(this, newTexture);
    newTexture.free();
    return this;
  }

  /** Draws this texture to a specific position */
  public draw(x: number, y: number, width?: number, height?: number) {
    if (this.width == -1 || this.height == -1) return;
    Peek.ctx.drawImage(
      TextureAtlas.atlasCanvas,
      this.atlasX, this.atlasY, this.width, this.height,
      x, y, width ?? this.width, height ?? this.height,
    );

    // this.tryOptimizeInAtlas();
  }

  /** Tries to move this texture closer to (0, 0) in the atlas. */
  public tryOptimizeInAtlas() {
    if (Math.random() > TEXTURE_OPTIMIZE_CHANCE) {
      // Only optimize sometimes
      return;
    }

    // Allocate the new space
    const newSpot = TextureAtlas.requestSize(
      this.width,
      this.height,
      TextureAtlas.positionScore(this.atlasX, this.atlasY)
    );

    if (newSpot) {
      // Unregister the old space (which is freed at the end)
      Texture.freeListener.unregister(this);

      // Save old position & update to new position
      const oldX = this.atlasX;
      const oldY = this.atlasY;
      this.atlasX = newSpot.x;
      this.atlasY = newSpot.y;

      // Register the new position
      Texture.freeListener.register(this, [ this.atlasX, this.atlasY ], this);

      // Move the old image to the new position
      TextureAtlas.clearRect(
        this.atlasX, this.atlasY,
        this.width, this.height
      );
      TextureAtlas.putImagePortion(
        oldX, oldY, this.width, this.height,
        this.atlasX, this.atlasY
      );

      TextureAtlas.freePos([ oldX, oldY ]);
    }
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

/** Sets the atlas color! */
export function atlasColor(color: Color) {
  TextureAtlas.atlasColor(color);
}

/**
 * Returns arguments to use in a full `drawImage` call.
 * 
 * (eg. `ctx.drawImage(...atlasSource(texture), 0, 0, width, height)`)
 * @param texture 
 * @returns 
 */
export function atlasSource(texture: Texture): [
  HTMLCanvasElement | OffscreenCanvas,
  number, number,
  number, number
] {
  texture.tryOptimizeInAtlas();
  return [
    TextureAtlas.atlasCanvas,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    texture.getAtlasX(), texture.getAtlasY(),
    texture.getWidth(), texture.getHeight()
  ];
}

window.TextureAtlas = TextureAtlas;
