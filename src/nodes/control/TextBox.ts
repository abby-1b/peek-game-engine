import { Color } from '../../resources/Color';
import { Font } from '../../resources/Font';
import { Texture } from '../../resources/Texture';
import { Vec2 } from '../../resources/Vec';
import { ControlNode } from './ControlNode';

/**
 * A box that renders text!
 * 
 * Since textboxes can change in size at any time, the resulting
 * textbox texture is stored in the texture atlas.
 */
export class TextBox extends ControlNode {
  public color = Color.WHITE;
  private font = Font.defaultFont;
  private text = '';
  private waitingForFontLoad = false;

  /** Sets the text */
  public setText(text: string): this {
    if (text !== this.text) {
      this.text = text;
      this.updateTexture();
    }
    return this;
  }

  /** Sets the color */
  public setColor(color: Color): this {
    if (!color.equals(this.color)) {
      this.color = color;
      this.updateTexture();
    }
    return this;
  }

  /** Sets the font */
  public setFont(font: Font): this {
    if (font !== this.font) {
      this.font = font;
      this.updateTexture();
    }
    return this;
  }

  private isSizeMinimum = false;

  /** Sets this node's size to the minimum that fits the given text */
  public setSizeMinimum() {
    this.setSizePixels(...this.realTextSize.asTuple());
    this.isSizeMinimum = true;
  }

  private realTextSize = Vec2.zero();
  private innerTexture?: Texture;

  /** Updates the inner texture */
  private updateTexture() {
    if (!this.font.isLoaded()) {
      if (this.waitingForFontLoad) {
        // Already waiting for the font to load
        return;
      }

      this.waitingForFontLoad = true;
      this.font.onFontLoad(() => {
        this.waitingForFontLoad = false;
        this.updateTexture();
      });
      return;
    }

    // Get the box size of the text
    this.realTextSize.setVec(this.font.getTextSize(this.text));

    // TODO: line wrapping
    // this.calculatedWidth

    // Ensure the texture exists & is big enough
    if (
      !this.innerTexture ||
      this.innerTexture.getWidth()  < this.realTextSize.x ||
      this.innerTexture.getHeight() < this.realTextSize.y
    ) {
      this.innerTexture = new Texture(...this.realTextSize.asTuple());
    }

    // Clear
    this.innerTexture!.fill(Color.TRANSPARENT);

    // Draw the text
    this.innerTexture!.runInContext((ctx) => {
      this.font.draw(this.text, 0, 0, ctx);
    });

    // Tint
    this.innerTexture.tint(this.color);
  }

  /** Draws the text. This has been pre-rendered to `texture` */
  protected override innerDraw(
    width: number,
    height: number
  ): void {
    if (!this.innerTexture) { return; }

    // console.log(Peek.ctx.getTransform());
    console.log(this.innerTexture!.getWidth(), this.innerTexture!.getHeight());

    // TODO: use width and height to support line wrapping
    this.innerTexture.draw(10, 10);
  }
}
