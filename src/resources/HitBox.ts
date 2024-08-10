import { Vec2 } from '../resources/Vec';

/** A hitbox, defined with x, y, width, and height components. */
export interface HitBox {
  x: number,
  y: number,

  /** Sets both the width and height (or radius!) to the given size. */
  setSize(size: number): void;
  /** Sets the width and height to the given size */
  setSize(width: number, height: number): void;

  /** Gets the center of this hitbox */
  center(): Vec2;
}

/** A square hitbox, defined with x, y, width and height. */
export class SquareBox implements HitBox {
  /** Makes a square hitbox */
  public constructor(
    public x: number,
    public y: number,
    public w: number,
    public h: number,
  ) {}

  /** Sets the size of this square box */
  public setSize(w: number, h?: number) {
    if (h === undefined) {
      this.w = w;
      this.h = w;
    } else {
      this.w = w;
      this.h = h;
    }
  }

  /** Gets the center of this square */
  public center(): Vec2 {
    return new Vec2(
      this.x + this.w * 0.5,
      this.y + this.h * 0.5,
    );
  }
}

/** A circular hitbox, defined with x, y, and radius */
export class CircleBox implements HitBox {
  /** Makes a circle hitbox */
  public constructor(
    public x: number,
    public y: number,
    public r: number,
  ) {}

  /** Sets the radius of this hitbox */
  public setSize(r: number) {
    this.r = r;
  }

  /** Gets the center of this circle (already centered) */
  public center(): Vec2 {
    return new Vec2(this.x, this.y);
  }
}

/** Checks if two hitboxes overlap */
export function hitboxOverlaps(hba: HitBox, hbb: HitBox) {
  if (hba instanceof SquareBox && hbb instanceof SquareBox) {
    return (
      hba.x < hbb.x + hbb.w &&
      hba.x + hba.w > hbb.x &&
      hba.y < hbb.y + hbb.h &&
      hba.y + hba.h > hbb.y
    );
  } else if (hba instanceof SquareBox && hbb instanceof CircleBox) {
    return (
      (Math.max(hba.x, Math.min(hbb.x, hba.x + hba.w)) - hbb.x) ** 2 +
      (Math.max(hba.y, Math.min(hbb.y, hba.y + hba.h)) - hbb.y) ** 2
    ) <= hbb.r ** 2;
  } else if (hba instanceof CircleBox && hbb instanceof SquareBox) {
    return (
      (Math.max(hbb.x, Math.min(hba.x, hbb.x + hbb.w)) - hba.x) +
      (Math.max(hbb.y, Math.min(hba.y, hbb.y + hbb.h)) - hba.y)
    ) <= hba.r ** 2;
  } else if (hba instanceof CircleBox && hbb instanceof CircleBox) {
    return (
      (hba.x - hbb.x) ** 2 +
      (hba.y - hbb.y) ** 2
    ) <= (hba.r + hbb.r) ** 2;
  }
}

/** Checks if a point falls within a hitbox (including its edges!) */
export function pointIsInHitbox(
  point: Vec2,
  hb: HitBox
) {
  if (hb instanceof SquareBox) {
    return (
      point.x >= hb.x &&
      point.y >= hb.y &&
      point.x <= (hb.x + hb.w) &&
      point.y <= (hb.y + hb.h)
    );
  } else if (hb instanceof CircleBox) {
    return (
      (point.x - hb.x) ** 2 +
      (point.y - hb.y) ** 2
    ) <= hb.r ** 2;
  }
}
