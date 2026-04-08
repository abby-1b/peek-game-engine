import { hitboxOverlaps, SquareBox, CircleBox } from '../resources/HitBox';
import { DynamicBody } from '../nodes/physics/DynamicBody';
import { StaticBody } from '../nodes/physics/StaticBody';
import { System } from './System';
import { Vec2 } from '../resources/Vec';
import { Signal } from '../util/Signal';
import { Scene } from '../nodes/Scene';
import { PNode } from '../nodes/PNode';

const maxFrames = 100;
const ft: number[] = [];

type Resolvable = { resolveVec?: Vec2; resolveCount?: number };

/** Processes physics! */
export class Physics extends System {
  public objects: Set<(StaticBody | DynamicBody) & Resolvable> = new Set();
  public dynamicObjects: Set<DynamicBody & Resolvable> = new Set();

  /**
   * Called by nodes that move in and out of the physics system's influence
   * @internal
   */
  public _nodeMovedSignal = new Signal<[StaticBody | DynamicBody]>();

  /** Initializes things necessary for physics to happen! */
  public constructor(parent: Scene) {
    super(parent);

    this.parent.nodeAdded.connect((node) => {
      if (!(node instanceof StaticBody)) return;
      this.addObject(node);
    });
    this.parent.nodeRemoved.connect((node) => {
      if (!(node instanceof StaticBody)) return;
      this.removeObject(node);
    });

    window.Physics = this;
  }

  /**
   * Adds an object, which will be processed every frame.
   * Make sure to call this in `.process()`, not in `.draw()`!
   * @param object The obejct to be added
   */
  public addObject(object: StaticBody) {
    if (object instanceof DynamicBody) {
      this.dynamicObjects.add(object);
    }
    this.objects.add(object);
  }

  /**
   * Removes an object, stopping it from being processed every frame.
   * Make sure to call this in `.process()`, not in `.draw()`!
   * @param object
   */
  public removeObject(object: StaticBody) {
    if (object instanceof DynamicBody) {
      this.dynamicObjects.delete(object);
    }
    this.objects.delete(object);
  }

  /** Processes all physics objects, including collisions and movement. */
  public process() {
    const start = performance.now();

    // Calculate hitboxes
    for (const obj of this.objects) {
      // Update the hitbox position
      obj.getHitbox(false);
      if (obj instanceof DynamicBody) {
        obj.resolveVec = Vec2.zero();
        obj.resolveCount = 0;
      }
    }

    for (const objA of this.dynamicObjects) {
      if (objA.isPinned) continue;
      for (const objB of this.objects) {
        if (objA.bodyId === objB.bodyId) {
          continue;
        }

        const hba = objA.hitBox;
        const hbb = objB.hitBox;
        if (!hitboxOverlaps(hba, hbb)) {
          continue;
        }

        // A is always dynamic
        // B is either dynamic or static, and is never acted upon
        // (B is acted upon when it's processed as A in a later iteration)

        objA.onCollide.activate(objB);
        objB.onCollide.activate(objA);

        const objASpeed = objA.velocity.length() + 1;
        const objBSpeed =
          objB instanceof DynamicBody ? objB.velocity.length() : 0;

        const aSpeedRatio = objASpeed / (objASpeed + objBSpeed);

        // Reference frame shift (relative to B)
        const movingReferenceFrame =
          objB instanceof DynamicBody && !objB.velocity.isZero();
        if (movingReferenceFrame) {
          objA.velocity.subVec(objB.velocity);
        }

        if (hba instanceof SquareBox && hbb instanceof SquareBox) {
          // Separating Axis Theorem
          const tDiff = hbb.y + hbb.h - hba.y;
          const bDiff = hba.y + hba.h - hbb.y;
          const lDiff = hbb.x + hbb.w - hba.x;
          const rDiff = hba.x + hba.w - hbb.x;
          const resolvePercent = aSpeedRatio;
          const resolveVec = objA.resolveVec!;

          if (tDiff < bDiff && tDiff < lDiff && tDiff < rDiff) {
            resolveVec.add(0, tDiff * resolvePercent);
            // objA.newVelChange.add(0, -aVelY * resolvePercent);
          } else if (bDiff < lDiff && bDiff < rDiff) {
            resolveVec.add(0, -bDiff * resolvePercent);
            // objA.newVelChange.add(0, -aVelY * resolvePercent);
          } else if (lDiff < rDiff) {
            resolveVec.add(lDiff * resolvePercent, 0);
            // objA.newVelChange.add(-aVelX * resolvePercent, 0);
          } else {
            resolveVec.add(-rDiff * resolvePercent, 0);
            // objA.newVelChange.add(-aVelX * resolvePercent, 0);
          }
        } else if (hba instanceof SquareBox && hbb instanceof CircleBox) {
          const correction = resolveCircleAABB(
            hbb.x,
            hbb.y,
            hbb.r,
            hba.x,
            hba.y,
            hba.w,
            hba.h,
          );
          objA.resolveVec!.addVec(correction);
        } else if (hba instanceof CircleBox && hbb instanceof SquareBox) {
          const correction = resolveCircleAABB(
            hba.x,
            hba.y,
            hba.r,
            hbb.x,
            hbb.y,
            hbb.w,
            hbb.h,
          );
          objA.resolveVec!.addVec(correction);
        } else if (hba instanceof CircleBox && hbb instanceof CircleBox) {
          const dist = new Vec2(hba.x - hbb.x, hba.y - hbb.y);
          const penetrationDepth = dist.length() - (hba.r + hbb.r);
          dist.normalize(-penetrationDepth);
          objA.resolveVec!.addVec(dist);
        } else {
          throw new Error('Unsupported hitbox types in collision resolution');
        }
        objA.resolveCount!++;

        // Reference frame shift (back to world)
        if (movingReferenceFrame) {
          objA.velocity.addVec(objB.velocity);
        }
      }
    }

    // Apply position and velocity changes
    for (const obj of this.dynamicObjects) {
      if (!obj.resolveCount || obj.isPinned) {
        continue;
      }

      obj.pos.addVecWithScalar(obj.resolveVec!, 1 / obj.resolveCount!);

      obj.resolveVec!.normalize();

      const dot = obj.resolveVec!.dot(obj.velocity);
      if (dot <= 0) {
        // We need to restrict the velocity!
        obj.velocity.addVecWithScalar(
          obj.resolveVec!,
          (1 + (obj as DynamicBody).bounce) * -dot,
        );
      }
    }

    const end = performance.now();
    const time = end - start;
    if (ft.length >= maxFrames) {
      ft.splice(0, 1);
    }
    ft.push(time);
  }
}

/**  */
function resolveCircleAABB(
  circleX: number,
  circleY: number,
  radius: number,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
): Vec2 {
  const nearestX = Math.max(boxX, Math.min(circleX, boxX + boxW));
  const nearestY = Math.max(boxY, Math.min(circleY, boxY + boxH));

  const dx = circleX - nearestX;
  const dy = circleY - nearestY;

  const distSq = dx * dx + dy * dy;

  // circle inside or touching
  if (distSq === 0) {
    // push out along smallest axis
    const left = circleX - boxX;
    const right = boxX + boxW - circleX;
    const top = circleY - boxY;
    const bottom = boxY + boxH - circleY;

    const min = Math.min(left, right, top, bottom);

    if (min === left) return new Vec2(-radius, 0);
    if (min === right) return new Vec2(radius, 0);
    if (min === top) return new Vec2(0, -radius);
    return new Vec2(0, radius);
  }

  const dist = Math.sqrt(distSq);

  if (dist >= radius) return Vec2.zero(); // no collision

  const penetration = radius - dist;

  return new Vec2((dx / dist) * penetration, (dy / dist) * penetration);
}
