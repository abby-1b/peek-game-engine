import { Peek } from '../peek';

/** Holds the data for a font */
export class Font {
  /**
   * The image containing the font. Fonts aren't loaded into the TextureAtlas,
   * which is done so they don't take up any space there.
   */
  private fontImage?: HTMLImageElement;

  private imageWidth!: number;
  private imageHeight!: number;
  private symbolsPerRow!: number;

  public symbolSpacing = 0;
  public lineSpacing = 1;
  public tabSize = 2;

  /** Loads a font */
  public constructor(
    url: string,
    public readonly symbolWidth: number,
    public readonly symbolHeight: number,
    public readonly dynamic: boolean
  ) {
    this.fontImage = new Image();
    this.fontImage.onload = () => this.fontLoaded(true);
    this.fontImage.onerror = (e) => {
      console.log(e);
      this.fontLoaded(false);
    };
    this.fontImage.src = url;
  }

  /** Runs when the font image either loads or errors. */
  private fontLoaded(success: boolean) {
    if (!success) {
      this.fontImage = undefined;
      return;
    }

    this.imageWidth = this.fontImage!.width;
    this.imageHeight = this.fontImage!.height;
    this.symbolsPerRow = Math.floor(this.imageWidth / this.symbolWidth);
  }

  /** Draws a string to the canvas */
  public draw(
    text: string, x: number, y: number,
    ctx: CanvasRenderingContext2D = Peek.ctx
  ) {
    let currX = x;
    let currY = y;
    for (const char of text) {
      if (char == ' ') {
        // Space
        currX += this.symbolWidth;
      } else if (char == '\n') {
        // Newline
        currX = x;
        currY += this.symbolHeight + this.lineSpacing;
      } else if (char == '\t') {
        // Tab
        currX += this.symbolWidth * this.tabSize;
      } else {
        // Normal character
        const charCode = char.charCodeAt(0);
        const srcX = charCode % this.symbolsPerRow;
        const srcY = ~~(charCode / this.symbolsPerRow);
        ctx.drawImage(
          this.fontImage!,
          srcX * this.symbolWidth, srcY * this.symbolHeight,
          this.symbolWidth, this.symbolHeight,
          currX, currY, this.symbolWidth, this.symbolHeight
        );
        currX += this.symbolWidth + this.symbolSpacing;
      }
    }
  }
}
