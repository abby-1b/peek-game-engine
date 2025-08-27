
/** The blend modes for drawing! */
export const enum BlendMode {
  NORMAL = 'source-over',
  ADD = 'lighter',
  MULTIPLY = 'multiply',
  SCREEN = 'screen',
  OVERLAY = 'overlay',
  SUBTRACT = 'difference',
  DEST_IN = 'destination-in',
  
  LUMINOSITY = 'luminosity',
  COLOR = 'color',
}

export interface BlendModeChangeable {
  blendMode: BlendMode;
  setBlendMode(blendMode: BlendMode): this;
}
