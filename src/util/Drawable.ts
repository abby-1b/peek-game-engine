import { Color } from '../resources/Color';

export interface Drawable {
  setPixel(x: number, y: number, color: Color): void;
  setPixelRaw(x: number, y: number, color: Uint8ClampedArray): void;
  getPixel(x: number, y: number): Color;
  getPixelRaw(x: number, y: number): Uint8ClampedArray;

  clearRect(x: number, y: number, width: number, height: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  rect(x: number, y: number, width: number, height: number): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
}
