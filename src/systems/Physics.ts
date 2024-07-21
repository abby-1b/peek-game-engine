import { hitboxOverlaps } from '../util/HitBox';
import { DynamicBody } from '../nodes/physics/DynamicBody';
import { StaticBody } from '../nodes/physics/StaticBody';
import { System } from './System';
import { Signal } from '../util/Signal';

/** Processes physics! */
export class Physics extends System {
  public objects: Set<StaticBody> = new Set();

  /**
   * Adds an object, which will be processed every frame.
   * Make sure to call this in `.process()`, not in `.draw()`!
   * @param object The obejct to be added
   */
  public addObject(object: StaticBody) {
    this.objects.add(object);
  }

  /**
   * Removes an object, stopping it from being processed every frame. 
   * Make sure to call this in `.process()`, not in `.draw()`!
   * @param o 
   */
  public removeObject(o: StaticBody) {
    this.objects.delete(o);
  }

  /** Processes all physics objects, including collisions and movement. */
  public process() {
    for (const objA of this.objects) {
      for (const objB of this.objects) {
        if (objA.bodyId == objB.bodyId) { continue; }
        if (!(objA instanceof DynamicBody)) { continue; }

        const hba = objA.getHitbox();
        const hbb = objB.getHitbox();
        if (!hitboxOverlaps(hba, hbb)) { continue; }

        // A is always dynamic
        // B is either dynamic or static

        Signal.send(objA, 'onCollide', objB);
        Signal.send(objB, 'onCollide', objA);

        const aSpeedRatio =
          objA.velocity.length() / (
            objA.velocity.length() +
            (objB instanceof DynamicBody ? objB.velocity.length() : 0)
          );

        // // Reference frame shift (relative to B)
        // Const movingReferenceFrame =
        //   ObjB instanceof DynamicBody && !objB.velocity.isZero();
        // If (movingReferenceFrame) {
        //   ObjA.velocity.subVec(objB.velocity);
        // }

        // Separating Axis Theorem
        const tDiff = (hbb.y + hbb.h) - hba.y;
        const bDiff = (hba.y + hba.h) - hbb.y;
        const lDiff = (hbb.x + hbb.w) - hba.x;
        const rDiff = (hba.x + hba.w) - hbb.x;
        const resolvePercent = aSpeedRatio;

        if (tDiff < bDiff && tDiff < lDiff && tDiff < rDiff) {
          objA.newPosChange.add(0, tDiff * resolvePercent);
          objA.newVelChange.add(0, -objA.velocity.y * resolvePercent);
        } else if (bDiff < lDiff && bDiff < rDiff) {
          objA.newPosChange.add(0, -bDiff * resolvePercent);
          objA.newVelChange.add(0, -objA.velocity.y * resolvePercent);
        } else if (lDiff < rDiff) {
          objA.newPosChange.add(lDiff * resolvePercent, 0);
          objA.newVelChange.add(-objA.velocity.x * resolvePercent, 0);
        } else {
          objA.newPosChange.add(-rDiff * resolvePercent, 0);
          objA.newVelChange.add(-objA.velocity.x * resolvePercent, 0);
        }
        
        // // Reference frame shift (back to world)
        // If (movingReferenceFrame) {
        //   ObjA.velocity.addVec(objB.velocity);
        // }
      }
    }

    // Apply position and velocity changes
    for (const obj of this.objects) {
      if (!(obj instanceof DynamicBody)) continue;
      
      obj.pos.addVec(obj.newPosChange);
      obj.newPosChange.set(0, 0);

      obj.velocity.addVec(obj.newVelChange);
      obj.newVelChange.set(0, 0);
    }
  }
}
