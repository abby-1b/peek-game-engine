import { DynamicBody } from '../nodes/physics/DynamicBody';
import { Peek } from '../peek';
import { Vec2 } from '../resources/Vec';
import { Physics } from './Physics';
import { System } from './System';

/**
 * Adds gravity to the entire physics system.
 * This applies to all DynamicBody nodes.
 */
export class Gravity extends System {
  public override requiredSystems = [ Physics ];

  public gravity: Vec2 = new Vec2(0, 0.8);

  /** Adds gravity to the physics */
  public process(delta: number) {
    for (const obj of Peek.getSystem(Physics)!.objects) {
      // Ensure we only affect DynamicBody nodes
      if (!(obj instanceof DynamicBody)) { continue; }

      // Apply gravity
      obj.velocity.addVec(this.gravity.mulScalarRet(delta));
    }
  }
}
