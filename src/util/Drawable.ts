import { Color } from '../resources/Color';

type CanvasContext =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

/**
 * Represents a surface that can be drawn from
 */
export interface DrawReadable {
  getPixel(x: number, y: number): Color;
  getPixelRaw(x: number, y: number): Uint8ClampedArray;

  // Draws this to a given destination (often with `DrawWritable.drawImage`)
  draw(x: number, y: number, destination?: DrawWritable): void;
  draw(
    x: number,
    y: number,
    width: number,
    height: number,
    destination?: DrawWritable,
  ): void;
  draw(
    sx: number,
    sy: number,
    swidth: number,
    sheight: number,
    dx: number,
    dy: number,
    dwidth: number,
    dheight: number,
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
    x: number,
    y: number,
    width: number,
    height: number,
    color: Color,
  ): void;
  rect(x: number, y: number, width: number, height: number, color: Color): void;

  /** Draws a centered circle outline at the given position */
  circle(x: number, y: number, radius: number, color: Color): void;
  /** Draws a centered, filled circle at the given position */
  fillCircle(x: number, y: number, radius: number, color: Color): void;

  /** Draws a circle outline within a bounding box (opposite corners) */
  circleR(x0: number, y0: number, x1: number, y1: number, color: Color): void;
  /** Draws a filled circle within a bounding box (opposite corners) */
  fillCircleR(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: Color,
  ): void;

  /** Draws a line */
  line(x1: number, y1: number, x2: number, y2: number, color: Color): void;
  /**
   * Draws a thick pixel line using EFLA-style stepping.
   * The edges aren't smoothed.
   */
  thickLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number,
    color: Color,
  ): void;

  // --- IMAGE DRAWING ---

  /** Draws an image to this (cannot rely on `DrawReadable.draw`) */
  drawImage(
    image: CanvasImageSource,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void;

  /** Draws an image to this (cannot rely on `DrawReadable.draw`) */
  drawImage(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    swidth: number,
    sheight: number,
    dx: number,
    dy: number,
    dwidth: number,
    dheight: number,
  ): void;

  runInContext(callback: (ctx: CanvasContext) => void): void;
}

/** Base functions for classes that draw to a canvas. */
export class BaseDrawWritable {
  /** Draws a centered circle outline at the given position */
  public static circle(
    ctx: CanvasContext,
    x: number,
    y: number,
    radius: number,
    color: Color,
  ): void {
    x = Math.floor(x);
    y = Math.floor(y);
    radius = ~~radius;

    ctx.fillStyle = color.fillStyle();

    let f = 1 - radius;
    let ddf_x = 1;
    let ddf_y = -2 * radius;
    let px = 0;
    let py = radius;

    // Draw the initial octant points
    ctx.fillRect(x, y + radius, 1, 1);
    ctx.fillRect(x, y - radius, 1, 1);
    ctx.fillRect(x + radius, y, 1, 1);
    ctx.fillRect(x - radius, y, 1, 1);

    while (px < py) {
      if (f >= 0) {
        py--;
        ddf_y += 2;
        f += ddf_y;
      }
      px++;
      ddf_x += 2;
      f += ddf_x;

      // Draw all 8 symmetric points
      ctx.fillRect(x + px, y + py, 1, 1);
      ctx.fillRect(x - px, y + py, 1, 1);
      ctx.fillRect(x + px, y - py, 1, 1);
      ctx.fillRect(x - px, y - py, 1, 1);
      ctx.fillRect(x + py, y + px, 1, 1);
      ctx.fillRect(x - py, y + px, 1, 1);
      ctx.fillRect(x + py, y - px, 1, 1);
      ctx.fillRect(x - py, y - px, 1, 1);
    }
  }

  /** Draws a centered, filled circle at the given position */
  public static fillCircle(
    ctx: CanvasContext,
    x: number,
    y: number,
    radius: number,
    color: Color,
  ): void {
    x = Math.floor(x);
    y = Math.floor(y);
    radius = ~~radius;

    ctx.fillStyle = color.fillStyle();

    let f = 1 - radius;
    let ddf_x = 1;
    let ddf_y = -2 * radius;
    let px = 0;
    let py = radius;

    // Draw the center line
    ctx.fillRect(x - radius, y, radius * 2 + 1, 1);

    while (px < py) {
      if (f >= 0) {
        py--;
        ddf_y += 2;
        f += ddf_y;
      }
      px++;
      ddf_x += 2;
      f += ddf_x;

      // Draw horizontal lines between symmetric points to fill the circle
      const fromX1 = x - py;
      const toX1 = x + py;
      const y1 = y + px;
      const y2 = y - px;

      ctx.fillRect(fromX1, y1, toX1 - fromX1 + 1, 1);
      ctx.fillRect(fromX1, y2, toX1 - fromX1 + 1, 1);

      const fromX2 = x - px;
      const toX2 = x + px;
      const y3 = y + py;
      const y4 = y - py;

      ctx.fillRect(fromX2, y3, toX2 - fromX2 + 1, 1);
      ctx.fillRect(fromX2, y4, toX2 - fromX2 + 1, 1);
    }
  }

  /** Draws a circle outline within a bounding box (opposite corners) */
  public static circleR(
    ctx: CanvasContext,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: Color,
  ): void {
    x0 = ~~x0;
    y0 = ~~y0;
    x1 = ~~x1 - 1;
    y1 = ~~y1 - 1;

    ctx.fillStyle = color.fillStyle();

    // Calculate height
    const yb = (y0 + y1) >> 1;
    let yc = yb;
    const qb = y0 < y1 ? y1 - y0 : y0 - y1;
    let qy = qb;
    let dy = qb >> 1;
    if ((qb & 1) !== 0) {
      // Bounding box has even pixel height
      yc++;
    }

    // Calculate width
    const xb = (x0 + x1) >> 1;
    let xc = xb;
    const qa = x0 < x1 ? x1 - x0 : x0 - x1;
    let qx = qa & 1;
    let dx = 0;
    let qt = qa * qa + qb * qb - 2 * qa * qa * qb;

    if (qx !== 0) {
      // Bounding box has even pixel width
      xc++;
      qt += 3 * qb * qb;
    }

    // Start at (dx, dy) = (0, b) and iterate until (a, 0) is reached
    while (qy >= 0 && qx <= qa) {
      // Draw the 4 points for outline
      ctx.fillRect(xb - dx, yb - dy, 1, 1);
      if (dx !== 0 || xb !== xc) {
        ctx.fillRect(xc + dx, yb - dy, 1, 1);
        if (dy !== 0 || yb !== yc) {
          ctx.fillRect(xc + dx, yc + dy, 1, 1);
        }
      }
      if (dy !== 0 || yb !== yc) {
        ctx.fillRect(xb - dx, yc + dy, 1, 1);
      }

      // If a (+1, 0) step stays inside the ellipse, do it
      if (
        qt + 2 * qb * qb * qx + 3 * qb * qb <= 0 ||
        qt + 2 * qa * qa * qy - qa * qa <= 0
      ) {
        qt += 8 * qb * qb + 4 * qb * qb * qx;
        dx++;
        qx += 2;
      }
      // If a (0, -1) step stays outside the ellipse, do it
      else if (qt - 2 * qa * qa * qy + 3 * qa * qa > 0) {
        qt += 8 * qa * qa - 4 * qa * qa * qy;
        dy--;
        qy -= 2;
      }
      // Else step (+1, -1)
      else {
        qt += 8 * qb * qb + 4 * qb * qb * qx + 8 * qa * qa - 4 * qa * qa * qy;
        dx++;
        qx += 2;
        dy--;
        qy -= 2;
      }
    }
  }

  /** Draws a filled circle within a bounding box (opposite corners) */
  public static fillCircleR(
    ctx: CanvasContext,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: Color,
  ): void {
    x0 = ~~x0;
    y0 = ~~y0;
    x1 = ~~x1 - 1;
    y1 = ~~y1 - 1;

    ctx.fillStyle = color.fillStyle();

    // Calculate height
    const yb = (y0 + y1) >> 1;
    let yc = yb;
    const qb = y0 < y1 ? y1 - y0 : y0 - y1;
    let qy = qb;
    let dy = qb >> 1;
    if ((qb & 1) !== 0) {
      // Bounding box has even pixel height
      yc++;
    }

    // Calculate width
    const xb = (x0 + x1) >> 1;
    let xc = xb;
    const qa = x0 < x1 ? x1 - x0 : x0 - x1;
    let qx = qa & 1;
    let dx = 0;
    let qt = qa * qa + qb * qb - 2 * qa * qa * qb;

    if (qx !== 0) {
      // Bounding box has even pixel width
      xc++;
      qt += 3 * qb * qb;
    }

    // Start at (dx, dy) = (0, b) and iterate until (a, 0) is reached
    while (qy >= 0 && qx <= qa) {
      // If a (+1, 0) step stays inside the ellipse, do it
      if (
        qt + 2 * qb * qb * qx + 3 * qb * qb <= 0 ||
        qt + 2 * qa * qa * qy - qa * qa <= 0
      ) {
        qt += 8 * qb * qb + 4 * qb * qb * qx;
        dx++;
        qx += 2;
      }
      // If a (0, -1) step stays outside the ellipse, do it
      else if (qt - 2 * qa * qa * qy + 3 * qa * qa > 0) {
        // Draw horizontal lines for the current y before moving to next y
        this.drawRowR(ctx, xb - dx, xc + dx, yc + dy);
        if (dy !== 0 || yb !== yc) {
          this.drawRowR(ctx, xb - dx, xc + dx, yb - dy);
        }
        qt += 8 * qa * qa - 4 * qa * qa * qy;
        dy--;
        qy -= 2;
      }
      // Else step (+1, -1)
      else {
        // Draw horizontal lines for the current y before moving to next y
        this.drawRowR(ctx, xb - dx, xc + dx, yc + dy);
        if (dy !== 0 || yb !== yc) {
          this.drawRowR(ctx, xb - dx, xc + dx, yb - dy);
        }
        qt += 8 * qb * qb + 4 * qb * qb * qx + 8 * qa * qa - 4 * qa * qa * qy;
        dx++;
        qx += 2;
        dy--;
        qy -= 2;
      }
    }

    // Draw the center row(s) at y = 0
    if (qb > 0) {
      this.drawRowR(ctx, xb, xc, yb);
      if (yb !== yc) {
        this.drawRowR(ctx, xb, xc, yc);
      }
    }
  }

  /** Helper method to draw a horizontal row from x1 to x2 (inclusive) */
  private static drawRowR(
    ctx: CanvasContext,
    x1: number,
    x2: number,
    y: number,
  ): void {
    if (x2 >= x1) {
      ctx.fillRect(x1, y, x2 - x1 + 1, 1);
    } else {
      ctx.fillRect(x2, y, x1 - x2 + 1, 1);
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
    ctx: CanvasContext,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: Color,
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

    const decInc: number =
      longLen === 0 ? 0 : Math.floor((shortLen << 16) / longLen);

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

  /**
   * Draws a thick pixel line using EFLA-style stepping
   *
   * Thickness is pixel diameter (>= 1)
   */
  public static thickLine(
    ctx: CanvasContext,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number,
    color: Color,
  ): void {
    ctx.fillStyle = color.fillStyle();

    x1 = ~~x1;
    y1 = ~~y1;
    x2 = ~~x2;
    y2 = ~~y2;

    thickness = thickness | 0;
    if (thickness <= 1) {
      // fall back to thin line
      this.line(ctx, x1, y1, x2, y2, color);
      return;
    }

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

    const decInc = longLen === 0 ? 0 : ((shortLen << 16) / longLen) | 0;

    let j = 0;

    const half = thickness >> 1;

    if (yLonger) {
      for (let i = 0; i !== endVal; i += incrementVal) {
        const x = x1 + (j >> 16);
        const y = y1 + i;
        ctx.fillRect(x - half, y, thickness, 1);
        j += decInc;
      }
    } else {
      for (let i = 0; i !== endVal; i += incrementVal) {
        const x = x1 + i;
        const y = y1 + (j >> 16);
        ctx.fillRect(x, y - half, 1, thickness);
        j += decInc;
      }
    }
  }
}
