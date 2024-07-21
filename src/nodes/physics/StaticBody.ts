import { Vec2 } from '../../resources/Vec';
import { HitBox } from '../../util/HitBox';
import { PNode } from '../PNode';
import { Physics } from '../../systems/Physics';
import { Peek } from '../../peek';

/**
 * A node that has physics! This body doesn't move, as it's meant to be used as
 * level collision. For movable bodies, use `DynamicBody`. Its origin is on the
 * top-left of its hitbox.
 */
export class StaticBody extends PNode {
  public static currentBodyId: number = 0;

  public readonly size = Vec2.zero();
  public readonly bodyId: number;

  /** Constructs a static body! */
  public constructor() {
    super();
    this.bodyId = StaticBody.currentBodyId++;
  }


  /** Sets the body's size */
  public setSize(x: number, y: number): this {
    this.size.set(x, y);
    return this;
  }

  /** Gets this node's hitbox */
  public override getHitbox(integer: boolean): HitBox {
    const tw = this.size.x;
    const th = this.size.y;
    return super.getHitbox(
      integer,
      Math.floor(-tw / 2),
      Math.floor(-th / 2),
      tw,
      th,
    );
  }

  /** Ensures the physics system has proper access to physics objects */
  protected override moved(): void {
    const physicsSystem = Peek.getSystem(Physics);
    if (this.parent == undefined) {
      physicsSystem?.removeObject(this);
    } else {
      physicsSystem?.addObject(this);
    }
  }
}
