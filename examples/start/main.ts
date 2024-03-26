/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Peek } from '../../src/peek';
import { Node } from '../../src/nodes/Node';
import { Color } from '../../src/resources/Color';
import { Texture } from '../../src/resources/Texture';
import { Gen } from '../../src/resources/Gen';
import { FillRect } from '../../src/nodes/FillRect';
import { Character } from '../../src/nodes/Character';
import { Sprite } from '../../src/nodes/Sprite';
import { BlendMode } from '../../src/util/BlendMode';
import { randomRange } from '../../src/util/math';
import { Scene } from '../../src/nodes/Scene';

// Nodes
// Declare const Box: any;
// Declare const Particles: any;

// Resources
declare const Rect: any;

// Peek.screenSize(512, 512);
// Peek.screenSize(1024, 1024);

/**  */
class TestGame extends Scene {
  /**  */
  protected ready(): void {
    this.add(
      new FillRect(Color.RED),
      /*New Character().add(
        new Sprite().setTexture(Gen.bitNoise(8, 8, {
          colors: [ Color.WHITE, Color.TRANSPARENT ]
        })),
      ),*/
      // New Box(new Rect(0, 100, 128, 28), true),
      // New Particles(new Rect(0, -1, 128, 1))
    );
    
  }
}

Peek.start(new TestGame());
