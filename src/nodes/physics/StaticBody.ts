import { Vec2 } from '../../resources/Vec';
import { HitBox } from '../../util/HitBox';
import { PNode } from '../PNode';

/**
 * A node that has physics! This body doesn't move, as it's meant to be used as
 * level collision. For movable bodies, use `DynamicBody`. Its origin is on the
 * top-left of its hitbox.
 */
export class StaticBody extends PNode {
  public readonly size = Vec2.zero();

  /** Checks if this body overlaps a given node. Uses the `getHitbox` method! */
  public overlaps(node: PNode): boolean {
    const hba = this.getHitbox();
    const hbb = node.getHitbox();
    return (
      hba.x < hbb.x + hbb.w &&
      hba.x + hba.w > hbb.x &&
      hba.y < hbb.y + hbb.h &&
      hba.y + hba.h > hbb.y
    );
  }

  /** Gets this node's hitbox */
  public getHitbox(): HitBox {
    return super.getHitbox(this.size.x, this.size.y);
  }
}
