import { FillRect } from '../nodes/control/FillRect';
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
  }
}

/** The Peek startup scene! */
export class StartupScene extends Scene {
  private particles: WiggleSprite[] = [];

  /** Makes the startup scene, and sets the scene that comes after it. */
  public constructor(public afterScene: Scene) {
    Peek.preLoadScene(afterScene);
    super();
  }

  /** Sets up the background, particles, and image. */
  protected ready(): void {

    // Add the background and logo
    this.add(
      new FillRect().setColor(Color.WHITE),
      new Sprite()
        .setTexture(Texture.load('../../assets/logo-dark.png'))
        .run(s => s.pos.set(Peek.screenWidth / 2, Peek.screenHeight / 2))
        .hide()
    );
    
    // Add the particles
    const particleColor = new Color(20);
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
        );
      particle.pos.spreadRangeVec(
        Peek.center,
        Peek.screenWidth + Peek.screenHeight,
        (Peek.screenWidth + Peek.screenHeight) * 2
      );
      this.add(particle);
      this.particles.push(particle);
    }

  }

  /** Animates the startup sequence */
  protected process(): void {
    
    if (Peek.frameCount == 100) {
      // Change background
      (this.children[0] as FillRect).color = Color.BLACK;

      // Show logo
      (this.children[1] as Sprite).show();

      // Remove particles
      this.remove(...this.particles);
      this.particles = [];

    } else if (Peek.frameCount == 240) {
      Peek.loadScene(this.afterScene);
    }
  }

}
