import { Color } from '../resources/Color';
import { Texture } from '../resources/Texture';

type CanvasContext =
  CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Represents a surface that can be drawn from
 */
export interface DrawReadable {
  getPixel(x: number, y: number): Color;
  getPixelRaw(x: number, y: number): Uint8ClampedArray;

  // Draws this to a given destination (often with `DrawWritable.drawImage`)
  draw(
    x: number, y: number,
    destination?: DrawWritable,
  ): void;
  draw(
    x: number, y: number,
    width: number, height: number,
    destination?: DrawWritable,
  ): void;
  draw(
    sx: number, sy: number,
    swidth: number, sheight: number,
    dx: number, dy: number,
    dwidth: number, dheight: number,
    destination?: DrawWritable,
  ): void;
}

/**
 * Represents a surface that can be drawn to
 */
export interface DrawWritable {
  /** Sets a single pixel pixel to a `Color` */
  setPixel(x: number, y: number, color: Color): void;
  /** Sets a single pixel to a raw buffer's color */
  setPixelRaw(x: number, y: number, color: Uint8ClampedArray): void;

  clearRect(x: number, y: number, width: number, height: number): void;
  fillRect(
    x: number, y: number,
    width: number, height: number,
    color: Color
  ): void;
  rect(
    x: number, y: number,
    width: number, height: number,
    color: Color
  ): void;

  circle(x: number, y: number, radius: number, color: Color): void;
  fillCircle(x: number, y: number, radius: number, color: Color): void;
  line(x1: number, y1: number, x2: number, y2: number, color: Color): void;

  // Draws an image to this (cannot rely on `DrawReadable.draw`)
  drawImage(
    image: CanvasImageSource,
    x: number, y: number,
    width: number, height: number,
  ): void;

  // Draws an image to this (cannot rely on `DrawReadable.draw`)
  drawImage(
    image: CanvasImageSource,
    sx: number, sy: number,
    swidth: number, sheight: number,
    dx: number, dy: number,
    dwidth: number, dheight: number,
  ): void;

  runInContext(callback: (ctx: CanvasContext) => void): void;
}

/** Base functions for classes that draw to a canvas. */
export class BaseDrawWritable {
  /** Draws a centered circle outline at the given position */
  public static circle(
    ctx: CanvasContext,
    x: number, y: number, radius: number, color: Color
  ): void {
    x = Math.floor(x);
    y = Math.floor(y);
    radius = ~~radius;

    ctx.fillStyle = color.fillStyle();

    let last = radius - 1;
    for (let p = 0; p < radius; p++) {
      const f = p / (radius - 1);
      const h = ~~(Math.sqrt(1 - f ** 2) * radius);
      const colHeight = (last - h) || 1;

      ctx.fillRect(
        x + p,
        y + h,
        1, colHeight
      );
      ctx.fillRect(
        x + p,
        y - h,
        1, -colHeight
      );
      ctx.fillRect(
        x - p,
        y + h,
        1, colHeight
      );
      ctx.fillRect(
        x - p,
        y - h,
        1, -colHeight
      );

      last = h;
    }
  }

  /** Draws a centered, filled circle at the given position */
  public static fillCircle(
    ctx: CanvasContext,
    x: number, y: number, radius: number, color: Color
  ): void {
    x = Math.floor(x);
    y = Math.floor(y);
    radius = ~~radius;

    ctx.fillStyle = color.fillStyle();

    for (let p = 1; p < radius; p++) {
      const f = p / (radius - 1);
      const h = ~~(Math.sqrt(1 - f ** 2) * radius);

      ctx.fillRect(
        x + p,
        y + h,
        1, -h * 2
      );
      ctx.fillRect(
        x - p,
        y + h,
        1, -h * 2
      );
    }
    ctx.fillRect(x, y - radius, 1, radius * 2);
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
    ctx: CanvasContext,
    x1: number, y1: number, x2: number, y2: number, color: Color
  ): void {
    ctx.fillStyle = color.fillStyle();
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

    const decInc: number = longLen === 0
      ? 0
      : Math.floor((shortLen << 16) / longLen);

    let j = 0;
    if (yLonger) {
      for (let i = 0; i !== endVal; i += incrementVal) {
        ctx.fillRect(x1 + (j >> 16), y1 + i, 1, 1);
        j += decInc;
      }
    } else {
      for (let i = 0; i !== endVal; i += incrementVal) {
        ctx.fillRect(x1 + i, y1 + (j >> 16), 1, 1);
        j += decInc;
      }
    }
  }
}

