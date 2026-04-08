import { Peek } from '../peek';
import { DrawWritable } from '../util/Drawable';
import { Path } from '../util/Path';
import { Vec2 } from './Vec';

/** Axis-aligned rectangle in pixel space. */
interface GlyphRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A single extracted glyph. */
interface Glyph {
  rect: GlyphRect;
  data: Uint8ClampedArray;
}

/** Raw font image as passed in by the caller. */
interface FontImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** A font loaded from an atlas image */
export class Font {
  public static loadedFonts: Record<string, Font> = {};

  public static defaultFont = Font.load(
    Path.relativeToModule(import.meta.url, '../resources/font-medium.png'),
  );

  public symbolWidth: number = 5;
  public symbolHeight: number = 8;
  public symbolSpacing = 1;
  public lineSpacing = 1;
  public tabSize = 2;

  // Updated to allow a processed Canvas to act as the source image
  private originalImage?: HTMLImageElement | HTMLCanvasElement;
  private glyphs: Glyph[] = [];
  private imageWidth = 0;
  private imageHeight = 0;
  private loaded = false;
  private loadCallbacks: ((font: Font) => void)[] = [];

  /** Constructs a font with the given symbol dimensions. */
  private constructor() {
  }

  /** Checks if the font is loaded. */
  public isLoaded(): boolean {
    return this.loaded;
  }

  /** Runs the given callback when the font is loaded. */
  public onFontLoad(callback: (font: Font) => void): void {
    if (this.loaded) callback(this);
    else this.loadCallbacks.push(callback);
  }

  /** Returns the number of glyphs in this font. */
  public getGlyphCount(): number {
    return this.glyphs.length;
  }

  /** Returns the glyph at the given index, or undefined. */
  public getGlyph(index: number): Glyph | undefined {
    return this.glyphs[index];
  }

  /** Returns the width of the original font atlas image. */
  public getImageWidth(): number {
    return this.imageWidth;
  }

  /** Returns the height of the original font atlas image. */
  public getImageHeight(): number {
    return this.imageHeight;
  }

  /** Returns the bounding rectangle of the glyph in the original atlas. */
  public getGlyphRect(index: number): GlyphRect | undefined {
    return this.glyphs[index]?.rect;
  }

  /** Draws a glyph onto a canvas context. */
  public drawGlyph(
    ctx: CanvasRenderingContext2D,
    index: number,
    x: number,
    y: number
  ): boolean {
    const glyph = this.glyphs[index];
    if (!glyph) return false;

    const imageData = new ImageData(
      glyph.data.slice(),
      glyph.rect.width, glyph.rect.height
    );
    ctx.putImageData(imageData, x, y);
    return true;
  }

  /** Gets the size of a piece of text using proportional glyph widths. */
  public getTextSize(text: string): Vec2 {
    if (!this.loaded) return Vec2.zero();

    const sh = this.symbolHeight;
    const ss = this.symbolSpacing;
    const lh = sh + this.lineSpacing;
    const tabw = this.symbolWidth * this.tabSize;

    let maxW = 0;
    let curW = 0;
    let lines = 0;
    let hasText = false;

    for (let i = 0, n = text.length; i < n; i++) {
      const c = text.charCodeAt(i);
      hasText = true;

      if (c === 10) { // Newline
        if (curW > maxW) maxW = curW;
        curW = 0;
        lines++;
      } else if (c === 9) { // Tab
        curW += tabw;
      } else {
        const idx = c - 32;
        const glyph = this.glyphs[idx];
        // Use exact glyph width if found, otherwise fallback
        curW += (glyph ? glyph.rect.width : this.symbolWidth) + ss;
      }
    }

    if (hasText) lines++;
    if (curW > maxW) maxW = curW;
    if (maxW > 0) maxW -= ss; // Remove trailing space

    return new Vec2(maxW, lh * lines);
  }

  /** Draws a string using the destination's drawImage method. */
  public draw(
    text: string, x: number, y: number,
    destination: DrawWritable = Peek
  ): void {
    if (!this.loaded || !this.originalImage) return;

    const img = this.originalImage;
    const sw = this.symbolWidth;
    const ss = this.symbolSpacing;
    const lh = this.symbolHeight + this.lineSpacing;
    const tabw = sw * this.tabSize;

    let cx = x;
    let cy = y;

    for (let i = 0, n = text.length; i < n; i++) {
      const c = text.charCodeAt(i);
     
      if (c === 10) { // Newline
        cx = x;
        cy += lh;
      } else if (c === 9) { // Tab
        cx += tabw;
      } else {
        const idx = c - 32;
        const glyph = this.glyphs[idx];
       
        if (glyph) {
          if (c !== 32) {
            const { x: sx, y: sy, width: gw, height: gh } = glyph.rect;
            destination.drawImage(
              img,
              sx, sy, gw, gh,
              cx, cy, gw, gh
            );
          }
          cx += glyph.rect.width + ss;
        } else {
          cx += sw + ss;
        }
      }
    }
  }

  /** Loads a font from the given URL. */
  public static load(
    url: string,
  ): Font {
    let f = Font.loadedFonts[url];
    if (!f) {
      f = new Font();
      Font.loadedFonts[url] = f;
      f._loadImage(url);
    }
    return f;
  }

  /** Loads the font image, pre-processes colors, and extracts glyphs. */
  private _loadImage(url: string): void {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
     
      const imgData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imgData.data;
     
      // Preserve a raw copy for _findGlyphRects so magenta flood fill works
      const rawData = new Uint8ClampedArray(data);

      // Pre-process the atlas globally so draw() naturally renders transparency
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (Font._isMagenta(r, g, b)) {
          // Magenta -> Transparent
          data[i + 3] = 0;
        } else if (r === 255 && g === 255 && b === 255) {
          // White bounds -> Transparent
          data[i + 3] = 0;
        } else if (r === 0 && g === 0 && b === 0) {
          // Black ink -> White (tintable)
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
          data[i + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);

      const fontImage: FontImage = {
        width: img.width,
        height: img.height,
        data: rawData
      };
     
      this._parseImage(fontImage);
     
      // Store the PROCESSED canvas as the master image for the draw() routine
      this.originalImage = canvas;
      this.loaded = true;
      for (const cb of this.loadCallbacks) cb(this);
      this.loadCallbacks.length = 0;
    };
    img.onerror = (e) => {
      console.error(e);
      this.loaded = false;
    };
    img.src = url;
  }

  /** Parses the font image to extract glyphs. */
  private _parseImage(image: FontImage): void {
    const rects = Font._findGlyphRects(image);
    const sorted = Font._sortGlyphRects(rects);
    this.glyphs = sorted.map(r => Font._extractGlyph(image, r));
    this.imageWidth = image.width;
    this.imageHeight = image.height;
  }

  /** Returns true for pure magenta (#ff00ff). */
  private static _isMagenta(r: number, g: number, b: number): boolean {
    return r === 255 && g === 0 && b === 255;
  }

  /** Reads RGB values from the buffer. */
  private static _readRGB(
    data: Uint8ClampedArray, idx: number
  ): [number, number, number] {
    return [ data[idx], data[idx + 1], data[idx + 2] ];
  }

  /** Finds bounding boxes of all non‑magenta regions. */
  private static _findGlyphRects(image: FontImage): GlyphRect[] {
    const { width, height, data } = image;
    const visited = new Uint8Array(width * height);
    const rects: GlyphRect[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = y * width + x;
        if (visited[pixelIndex]) continue;

        const [r, g, b] = Font._readRGB(data, pixelIndex * 4);
        visited[pixelIndex] = 1;
        if (Font._isMagenta(r, g, b)) continue;

        let minX = x, maxX = x, minY = y, maxY = y;
        const queue: number[] = [pixelIndex];
        let head = 0;

        while (head < queue.length) {
          const curr = queue[head++];
          const cx = curr % width;
          const cy = Math.floor(curr / width);

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          const neighbours: number[] = [];
          if (cy > 0) neighbours.push(curr - width);
          if (cy < height - 1) neighbours.push(curr + width);
          if (cx > 0) neighbours.push(curr - 1);
          if (cx < width - 1) neighbours.push(curr + 1);

          for (const n of neighbours) {
            if (visited[n]) continue;
            visited[n] = 1;
            const [nr, ng, nb] = Font._readRGB(data, n * 4);
            if (!Font._isMagenta(nr, ng, nb)) {
              queue.push(n);
            }
          }
        }

        rects.push({
          x: minX, y: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1
        });
      }
    }

    return rects;
  }

  /** Sorts rectangles in reading order. */
  private static _sortGlyphRects(rects: GlyphRect[]): GlyphRect[] {
    return [...rects].sort((a, b) => a.y - b.y || a.x - b.x);
  }

  /** Extracts a single glyph and remaps colours. */
  private static _extractGlyph(image: FontImage, rect: GlyphRect): Glyph {
    const { data: src, width: imgWidth } = image;
    const { x: rx, y: ry, width: rw, height: rh } = rect;

    const out = new Uint8ClampedArray(rw * rh * 4);

    for (let dy = 0; dy < rh; dy++) {
      for (let dx = 0; dx < rw; dx++) {
        const srcIdx = ((ry + dy) * imgWidth + (rx + dx)) * 4;
        const dstIdx = (dy * rw + dx) * 4;

        const r = src[srcIdx];
        const g = src[srcIdx + 1];
        const b = src[srcIdx + 2];

        if (r === 255 && g === 255 && b === 255) {
          // White background becomes transparent
          out[dstIdx] = 0;
          out[dstIdx + 1] = 0;
          out[dstIdx + 2] = 0;
          out[dstIdx + 3] = 0;
        } else if (r === 0 && g === 0 && b === 0) {
          // Black stroke becomes white (tintable)
          out[dstIdx] = 255;
          out[dstIdx + 1] = 255;
          out[dstIdx + 2] = 255;
          out[dstIdx + 3] = 255;
        } else {
          // Unexpected colour: passthrough
          out[dstIdx] = r;
          out[dstIdx + 1] = g;
          out[dstIdx + 2] = b;
          out[dstIdx + 3] = 255;
        }
      }
    }

    return { rect, data: out };
  }
}