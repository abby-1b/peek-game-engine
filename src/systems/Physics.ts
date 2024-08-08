import { hitboxOverlaps, SquareBox, CircleBox } from '../resources/HitBox';
import { DynamicBody } from '../nodes/physics/DynamicBody';
import { StaticBody } from '../nodes/physics/StaticBody';
import { System } from './System';
import { Signal } from '../util/Signal';
import { Vec2 } from '../resources/Vec';

const maxFrames = 100;
const ft: number[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any

type Resolvable = { resolveVec?: Vec2, resolveCount?: number };

/** Processes physics! */
export class Physics extends System {
  public objects: Set<(StaticBody | DynamicBody) & Resolvable> = new Set();
  public dynamicObjects: Set<DynamicBody & Resolvable> = new Set();

  /** Initializes things necessary for physics to happen! */
  public constructor() {
    super();

    Signal.listenVirtual('Physics', 'movedNode', (object: StaticBody) => {
      if (object.parent == undefined) {
        this.removeObject(object);
      } else {
        this.addObject(object);
      }
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
      for (const objB of this.objects) {
        if (objA.bodyId == objB.bodyId) { continue; }

        const hba = objA.hitBox;
        const hbb = objB.hitBox;
        if (!hitboxOverlaps(hba, hbb)) { continue; }

        // A is always dynamic
        // B is either dynamic or static, and is never acted upon
        // (B is acted upon when it's processed as A in a later iteration)

        Signal.send(objA, 'onCollide', objB);
        Signal.send(objB, 'onCollide', objA);

        const objASpeed = objA.velocity.length() + 1;
        const objBSpeed = objB instanceof DynamicBody
          ? objB.velocity.length() : 0;

        const aSpeedRatio = objASpeed / (objASpeed + objBSpeed);

        // Reference frame shift (relative to B)
        const movingReferenceFrame =
          objB instanceof DynamicBody && !objB.velocity.isZero();
        if (movingReferenceFrame) {
          objA.velocity.subVec(objB.velocity);
        }

        if (hba instanceof SquareBox && hbb instanceof SquareBox) {
          // Separating Axis Theorem
          const tDiff = (hbb.y + hbb.h) - hba.y;
          const bDiff = (hba.y + hba.h) - hbb.y;
          const lDiff = (hbb.x + hbb.w) - hba.x;
          const rDiff = (hba.x + hba.w) - hbb.x;
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
          const nearestX = Math.max(hba.x, Math.min(hbb.x, hba.x + hba.w));
          const nearestY = Math.max(hba.y, Math.min(hbb.y, hba.y + hba.h));
          const dist = new Vec2(hbb.x - nearestX, hbb.y - nearestY);

          const penetrationDepth = dist.length() - hbb.r;
          dist.normalize(penetrationDepth);
          objA.resolveVec!.addVec(dist);
        } else {
          // TODO: Circle-Square & Circle-Circle collision resolution
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
      if (!obj.resolveCount) { continue; }

      obj.pos.addVecWithScalar(obj.resolveVec!, 1 / obj.resolveCount!);

      obj.resolveVec!.normalize();

      const dot = obj.resolveVec!.dot(obj.velocity);
      if (dot <= 0) {
        // We need to restrict the velocity!
        const bounce = 0;
        obj.velocity.addVecWithScalar(obj.resolveVec!, (1 + bounce) * -dot);
      }
    }

    const end = performance.now();
    const time = end - start;
    if (ft.length >= maxFrames) {
      ft.splice(0, 1);
    }
    ft.push(time);

    let avg = 0;
    for (const t of ft) {
      avg += t;
    }
    // console.log(avg / ft.length);
  }
}
