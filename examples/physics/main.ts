import { Camera } from '../../src/nodes/Camera';
import { DynamicBody } from '../../src/nodes/physics/DynamicBody';
import { StaticBody } from '../../src/nodes/physics/StaticBody';
import { Scene } from '../../src/nodes/Scene';
import { Peek } from '../../src/peek';
import { CircleBox } from '../../src/resources/HitBox';
import { Debugger } from '../../src/systems/Debugger';
import { Gravity } from '../../src/systems/Gravity';
import { Physics } from '../../src/systems/Physics';

/**  */
class PhysicsTest extends Scene {
  /**  */
  protected override async preload() {
    Peek.getSystem(Gravity)!.gravity.set(0, 0.05);

    let camera: Camera;
    let floor: StaticBody;

    DynamicBody.baseFriction = 0.01;

    this.add(
      camera = new Camera(),
      floor = new StaticBody()
    );
    floor.hitBox.setSize(128, 4);

    camera.pos.add(0, -16);
    floor.pos.add(0, 16);

    for (let i = 0; i < 64; i++) {
      const box = new DynamicBody();
      const sz = 8 * ~~((Math.random() ** 100) * 5 + 1);
      // if (Math.random() < 0.5) {
      //   box.hitBox = new CircleBox(0, 0, 0);
      // }
      box.hitBox.setSize(sz, sz);
      box.pos.spread(0, -64, 64);
      this.add(box);
    }
  }

  /**  */
  protected override process(delta: number): void {
    if (Peek.frameCount === 3) {
      // Debugger.isPaused = true;
    }
  }
}

Peek.enableSystems(Gravity, Physics, Debugger);

Peek.start(
  new PhysicsTest(),
  {
    size: {
      width: 512,
      height: 512,
      adaptive: true
    }
  }
);
