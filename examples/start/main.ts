/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Peek } from '../../src/peek';
import { Color } from '../../src/resources/Color';
import { Texture } from '../../src/resources/Texture';
import { FillRect } from '../../src/nodes/control/FillRect';
import { Sprite } from '../../src/nodes/Sprite';
import { Scene } from '../../src/nodes/Scene';
import { Control } from '../../src/control/Control';
import { DynamicBody } from '../../src/nodes/physics/DynamicBody';
import { StaticBody } from '../../src/nodes/physics/StaticBody';
import { Physics } from '../../src/systems/Physics';
import { Gravity } from '../../src/systems/Gravity';

/**  */
class TestGame extends Scene {
  protected player!: DynamicBody;
  protected ground!: StaticBody;
  protected controller = Control.simpleAddController();

  /**  */
  protected ready(): void {
    // Setup controller

    // Setup scene
    this.add(
      new FillRect().setColor(Color.RED),
      new FillRect().setColor(Color.BLACK),
      new FillRect().setColor(Color.BLUE),
      new FillRect().setColor(Color.GREEN),
      this.player = new DynamicBody().setSize(32, 32).add(
        new Sprite()
          .setTexture(Texture.load('../../assets/logo.png'))
      ),
      this.ground = new StaticBody().setSize(64, 8)
      /*New Character().add(
        new Sprite().setTexture(Gen.bitNoise(8, 8, {
          colors: [ Color.WHITE, Color.TRANSPARENT ]
        })),
      ),*/
      // New Box(new Rect(0, 100, 128, 28), true),
      // New Particles(new Rect(0, -1, 128, 1))
    );

    this.player.pos.add(Peek.screenWidth / 2, Peek.screenHeight / 2);
    this.ground.pos.add(Peek.screenWidth / 2, Peek.screenHeight * 0.9);
  }
  
  /**  */
  protected process(): void {
    this.player.acceleration.set(
      this.controller.direction.x,
      this.controller.direction.y
    );
  }

  /**  */
  protected draw() {
    Peek.ctx.fillStyle = Color.RED.fillStyle();
    // Console.log(this.controller.pointer + '');
    Peek.ctx.fillRect(...this.controller.pointer.rounded().asTuple(), 5, 5);
  }
}

// Peek.screenSize(256, 256);
Peek.enableSystems(
  Physics,
  Gravity
);
Peek.start(new TestGame(), {
  debug: true,
  size: {
    width: 128,
    height: 128,
    adaptive: true
  }
});
