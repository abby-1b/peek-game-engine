import { Color } from '../resources/Color';
import { Texture } from '../resources/Texture';

/**
 * Represents a surface that can be drawn from
 */
export interface DrawReadable {
  getPixel(x: number, y: number): Color;
  getPixelRaw(x: number, y: number): Uint8ClampedArray;

  // Draws this to a given destination (often with `DrawWriteable.drawImage`)
  draw(
    x: number, y: number,
    destination?: DrawWriteable,
  ): void;
  draw(
    x: number, y: number,
    width: number, height: number,
    destination?: DrawWriteable,
  ): void;
  draw(
    sx: number, sy: number,
    swidth: number, sheight: number,
    dx: number, dy: number,
    dwidth: number, dheight: number,
    destination?: DrawWriteable,
  ): void;
}

/**
 * Represents a surface that can be drawn to
 */
export interface DrawWriteable {
  setPixel(x: number, y: number, color: Color): void;
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

  runInContext(callback: (
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ) => void): void;
}
