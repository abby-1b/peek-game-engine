import { FillRect } from '../nodes/FillRect';
import { Scene } from '../nodes/Scene';
import { Sprite } from '../nodes/Sprite';
import { Peek } from '../peek';
import { BlendMode } from '../util/BlendMode';
import { Color } from './Color';
import { Gen } from './Gen';
import { Texture } from './Texture';

/**  */
class WiggleSprite extends Sprite {
  /**  */
  protected process(): void {
    this.pos.lerp(
      Peek.screenWidth / 2 + (Math.random() * 10) - 5,
      Peek.screenWidth / 2 + (Math.random() * 10) - 7,
      0.1
    );
    console.log(this.pos);
  }
}

/** The Peek startup scene! */
export class StartupScene extends Scene {

  /** Makes the startup scene, and sets the scene that comes after it. */
  public constructor(public afterScene: Scene) {
    super();
  }

  /** Sets up the background, particles, and image. */
  protected ready(): void {

    // Add the background and logo
    this.add(
      // New FillRect(Color.WHITE),
      new Sprite()
        .setTexture(Texture.load('../../assets/logo-dark.png'))
        .run(s => s.pos.set(Peek.screenWidth / 2, Peek.screenHeight / 2))
        .setCentered()
        .hide()
    );
    
    // Add the particles
    const particleColor = new Color(16);
    const particleSize = 6;
    const particleCount = 32;
    for (let i = 0; i < particleCount; i++) {
      const particle = new WiggleSprite()
        .setBlendMode(BlendMode.SUBTRACT)
        .setTexture(
          Gen.bitNoise(particleSize, particleSize, {
            colors: [ particleColor, Color.TRANSPARENT ]
          })
            .maskCircle(true)
        ).setCentered();
      particle.pos.spreadRangeVec(
        Peek.center,
        Peek.screenWidth + Peek.screenHeight,
        (Peek.screenWidth + Peek.screenHeight) * 2
      );
      this.add(particle);
    }

  }

  /** Animates the startup sequence */
  protected process(): void {
    if (Peek.frameCount == 120) {
      (this.children[0] as FillRect).color = Color.BLACK;
      (this.children[1] as Sprite).show();
    } else if (Peek.frameCount == 240) {
      Peek.loadScene(this.afterScene);
    }
  }

}
