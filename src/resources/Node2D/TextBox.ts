import { Frame, Texture } from '../../modules/Frame.ts';
import { Node2D } from '../Node2D.ts';
import { Vec2 } from '../vector.ts';

const IMAGE_FORMAT = 'RGBA';
const DATA_FORMAT = 'UNSIGNED_BYTE';

/** Draws text! */
export class TextBox extends Node2D {
  public size: Vec2;
  protected text: string = '';
  protected ctx: CanvasRenderingContext2D;
  private texture: Texture;
  public color: [number, number, number] = [ 1, 1, 1 ];
  public fontSize = 12;

  /**  */
  public constructor(size: Vec2) {
    super();
    this.size = size;
    const canvas = document.createElement('canvas');
    this.ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    this.ctx.canvas.width  = this.size.x;
    this.ctx.canvas.height = this.size.y;
    this.texture = Frame.createTexture(
      this.size.x,
      this.size.y,
      IMAGE_FORMAT,
      DATA_FORMAT
    );
  }

  /** Sets the text being drawn */
  public setText(text: string) {
    if (this.text == text) return;
    this.text = text;

    // Draw the text
    this.ctx.clearRect(0, 0, this.size.x, this.size.y);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = `${this.fontSize}px serif`;
    this.ctx.textBaseline = 'hanging';

    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      this.ctx.fillText(lines[i], 0, 1 + i * this.fontSize);
    }

    // Put in a texture!
    Frame.setTextureData(
      this.texture,
      this.size.x,
      this.size.y,
      IMAGE_FORMAT,
      DATA_FORMAT,
      this.ctx.canvas
    );
  }

  /**  */
  public frame() {
    Frame.color(...this.color);
    Frame.drawTexture(this.texture, 0, 0, this.size.x, this.size.y);
  }
}
