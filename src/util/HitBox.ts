
/** A hitbox, defined with x, y, w, and h components. */
export interface HitBox {
  x: number,
  y: number,
  w: number,
  h: number,
}

/** Checks if two hitboxes overlap */
export function hitboxOverlaps(hba: HitBox, hbb: HitBox) {
  return (
    hba.x < hbb.x + hbb.w &&
    hba.x + hba.w > hbb.x &&
    hba.y < hbb.y + hbb.h &&
    hba.y + hba.h > hbb.y
  );
}
