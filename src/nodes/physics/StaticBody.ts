import { HitBox, SquareBox } from '../../resources/HitBox';
import { PNode } from '../PNode';
import { Signal } from '../../util/Signal';

/**
 * A node that has physics! This body doesn't move, as it's meant to be used as
 * level collision. For movable bodies, use `DynamicBody`. Its origin is on the
 * top-left of its hitbox.
 */
export class StaticBody extends PNode {
  public static currentBodyId: number = 0;
  public readonly bodyId: number;

  public hitBox: HitBox = new SquareBox(0, 0);

  /** Constructs a static body! */
  public constructor() {
    super();
    this.bodyId = StaticBody.currentBodyId++;
  }

  /** Sets this node's hitbox */
  public setHitbox(hb: HitBox): this {
    this.hitBox = hb;
    return this;
  }

  /** Gets this node's hitbox */
  public override getHitbox(integer: boolean): HitBox {
    return super.getHitbox(
      integer,
      this.hitBox
    );
  }

  /** Ensures the physics system has proper access to physics objects */
  protected override moved(): void {
    Signal.sendVirtual('Physics', 'movedNode', this);
  }
}
