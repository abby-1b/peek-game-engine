
/** The blend modes for drawing! */
export const enum BlendMode {
  NORMAL,
  ADD,
  MULTIPLY,
  SCREEN,
  OVERLAY,
  SUBTRACT,
}

/** Mappings from the BlendMode enum to their corresponding Context2D strings */
export const BLEND_MODE_MAPPINGS: Array<GlobalCompositeOperation> = [
  'source-over', // NORMAL
  'lighter', // ADD
  'multiply', // MULTIPLY
  'screen', // SCREEN
  'overlay', // OVERLAY
  'difference', // SUBTRACT
];
