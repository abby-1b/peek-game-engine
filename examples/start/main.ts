/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Peek } from '../../src/peek';
import { PNode } from '../../src/nodes/PNode';
import { Color } from '../../src/resources/Color';
import { Texture } from '../../src/resources/Texture';
import { Gen } from '../../src/resources/Gen';
import { FillRect } from '../../src/nodes/FillRect';
import { Character } from '../../src/nodes/Character';
import { Sprite } from '../../src/nodes/Sprite';
import { BlendMode } from '../../src/util/BlendMode';
import { randomRange } from '../../src/util/math';
import { Scene } from '../../src/nodes/Scene';
import { Control } from '../../src/control/Control';
import { Vec2 } from '../../src/resources/Vec';
import { DynamicBody } from '../../src/nodes/physics/DynamicBody';

// Nodes
// Declare const Box: any;
// Declare const Particles: any;

// Resources
declare const Rect: any;

// Peek.screenSize(512, 512);
// Peek.screenSize(1024, 1024);

/**  */
class TestGame extends Scene {
  protected player!: DynamicBody;

  protected speed: Vec2 = Vec2.zero();

  /**  */
  protected ready(): void {
    this.player = new DynamicBody().add(
      new Sprite()
        .setTexture(Texture.load('../../assets/logo.png'))
        .setCentered(true)
    );
    this.add(
      new FillRect(Color.BLACK),
      this.player,
      /*New Character().add(
        new Sprite().setTexture(Gen.bitNoise(8, 8, {
          colors: [ Color.WHITE, Color.TRANSPARENT ]
        })),
      ),*/
      // New Box(new Rect(0, 100, 128, 28), true),
      // New Particles(new Rect(0, -1, 128, 1))
    );

    const v = new Vec2(10, 1);
    v.div(10, 0);
    console.log(v);
  }

  /**  */
  protected process(): void {
    this.player.pos.addVec(Control.direction);
    this.speed.addVec(Control.direction);
    this.speed.mulScalar(0.9);

    this.player.pos.addVec(this.speed.mulScalarRet(0.1));
  }
}

Peek.start(new TestGame(), { debug: true });
