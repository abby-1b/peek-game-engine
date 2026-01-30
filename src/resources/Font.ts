import { Peek } from '../peek';
import { DrawWritable } from '../util/Drawable';
import { Path } from '../util/Path';
import { Vec2 } from './Vec';

/** Holds the data for a font */
export class Font {
  public static loadedFonts: Record<string, Font> = {};

  public static defaultFont = Font.load(
    Path.relativeToModule(
      import.meta.url,
      '../resources/font-medium.png'
    ),
    6, 8, false
  );

  /**
   * The image containing the font. Fonts aren't loaded into the TextureAtlas,
   * which is done so they don't take up any space there.
   */
  private fontImage?: HTMLImageElement;

  public isLoadedInner = false;
  /** Checks if the font is loaded */
  public isLoaded() {
    return this.isLoadedInner;
  }

  private fontLoadCallbacks: ((font: Font) => void)[] = [];

  private imageWidth!: number;
  private imageHeight!: number;
  private symbolsPerRow!: number;

  public symbolSpacing = 0;
  public lineSpacing = 1;
  public tabSize = 2;

  /**
   * Loads a font
   * @param url The path to the font
   * @param symbolWidth The individual symbol width in the font atlas
   * @param symbolHeight The individual symbol height in the font atlas
   * @param dynamic Whether or not the font is dynamic
   */
  public static load(
    url: string,
    symbolWidth: number,
    symbolHeight: number,
    isDynamic: boolean
  ) {
    if (url in this.loadedFonts) {
      return this.loadedFonts[url];
    } else {
      const newFont = new Font(url, symbolWidth, symbolHeight, isDynamic);
      this.loadedFonts[url] = newFont;
      return newFont;
    }
  }

  /** Loads a font */
  private constructor(
    url: string,
    public readonly symbolWidth: number,
    public readonly symbolHeight: number,
    public readonly isDynamic: boolean,
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
    this.isLoadedInner = true;

    for (const callback of this.fontLoadCallbacks) {
      callback(this);
    }
    this.fontLoadCallbacks = [];
  }

  /**
   * Runs the given callback when the font is loaded.
   * If the font is already loaded, it runs the callback immediately.
   */
  public onFontLoad(callback: (font: Font) => void) {
    if (this.isLoadedInner) {
      callback(this);
    } else {
      this.fontLoadCallbacks.push(callback);
    }
  }

  /** Gets the size of a piece of text */
  public getTextSize(text: string): Vec2 {
    if (this.isDynamic) {
      // TODO: implement textbox sizing for dynamic-sized fonts
      return Vec2.zero();
    } else {
      const totalLineHeight = this.lineSpacing + this.symbolHeight;
      const totalSymbolWidth = this.symbolWidth + this.symbolSpacing;

      let maxLineLen = 0;

      let trailingHSpace = 0;
      let trailingVSpace = 0;
      let lineCount = 0;
      let lineLen = 0;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '\n') {
          lineLen -= trailingHSpace;
          maxLineLen = Math.max(maxLineLen, lineLen);
          lineLen = 0;
          trailingHSpace = 0;
          lineCount++;
          trailingVSpace++;
        } else {
          if (char === ' ') {
            trailingHSpace++;
          } else {
            if (lineCount === 0) lineCount++;
            trailingVSpace = 0;
          }
          lineLen++;
        }
      }

      lineLen -= trailingHSpace;
      maxLineLen = Math.max(maxLineLen, lineLen);

      console.log(lineCount);

      // Trailing vertical space isn't counted
      lineCount -= trailingVSpace;

      return new Vec2(
        totalSymbolWidth * maxLineLen,
        totalLineHeight * lineCount
      );
    }
  }

  /** Draws a string */
  public draw(
    text: string, x: number, y: number,
    destination: DrawWritable = Peek
  ) {
    // Actually draw
    let currX = x;
    let currY = y;
    for (const char of text) {
      if (char === ' ') {
        // Space
        currX += this.symbolWidth;
      } else if (char === '\n') {
        // Newline
        currX = x;
        currY += this.symbolHeight + this.lineSpacing;
      } else if (char === '\t') {
        // Tab
        currX += this.symbolWidth * this.tabSize;
      } else {
        // Normal character
        const charCode = char.charCodeAt(0);
        const srcX = charCode % this.symbolsPerRow;
        const srcY = ~~(charCode / this.symbolsPerRow);
        destination.drawImage(
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
