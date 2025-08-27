import { FillRect } from '../nodes/control/FillRect';
import { PNode } from '../nodes/PNode';
import { Scene } from '../nodes/Scene';
import { Sprite } from '../nodes/Sprite';
import { Peek } from '../peek';
import { BlendMode } from '../util/BlendMode';
import { Color, ColorList } from './Color';
import { Gen } from './Gen';
import { Texture } from './Texture';

/**  */
class WiggleSprite extends Sprite {
  /**  */
  protected override process(delta: number): void {
    this.pos.lerp(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      0.13 ** delta
    );
  }
}

/** The Peek startup scene! */
export class StartupScene extends Scene {
  private particles: WiggleSprite[] = [];
  private background!: FillRect;
  private centered!: PNode;
  private logo!: Sprite;

  private remainingLogoFrames = -1;

  /** Makes the startup scene, and sets the scene that comes after it. */
  public constructor(public afterScene: Scene) {
    Peek.preloadScene(afterScene);
    super();
  }

  /** Sets up the background, particles, and image. */
  protected override async preload(): Promise<void> {

    // Add the background and logo
    this.add(
      this.background = new FillRect().setColor(Color.WHITE),
      this.centered = new PNode().add(
        this.logo = new Sprite()
          .setTexture(await Texture.preload('../../assets/logo-dark.png'))
          .hide()
      )
    );
    
    // Add the particles
    const particleColor = new ColorList([ new Color(20), Color.TRANSPARENT ]);
    const particleSize = 6;
    const particleCount = 32;
    for (let i = 0; i < particleCount; i++) {
      const particle = new WiggleSprite()
        .setBlendMode(BlendMode.SUBTRACT)
        .setTexture(
          Gen.bitNoise(particleSize, particleSize, {
            colors: particleColor
          })
            .maskCircle(true)
        );
      particle.pos.spreadRange(
        0, 0,
        Peek.screenWidth + Peek.screenHeight,
        (Peek.screenWidth + Peek.screenHeight) * 3
      );
      this.centered.add(particle);
      this.particles.push(particle);
    }

  }

  /** Animates the startup sequence */
  protected override process(): void {
    this.centered.pos.set(Peek.screenWidth / 2, Peek.screenHeight / 2);

    if (this.remainingLogoFrames === -1) {
      if (Peek.frameCount % 10 === 0) {
        // Check distances every ten frames
        let totalDist = 0;
        for (const particle of this.particles) {
          totalDist += particle.pos.lengthSquared();
        }
        console.log(totalDist);

        if (totalDist < 200) {
          this.remainingLogoFrames = 60;
        }
      }
    } else if (this.remainingLogoFrames === 0) {
      Peek.loadScene(this.afterScene);
    } else {
      // Change background
      this.background.color = Color.BLACK;
  
      // Show logo
      this.logo.show();
  
      // Remove particles
      this.centered.remove(...this.particles);
      this.particles = [];

      // Tick the timer
      this.remainingLogoFrames--;
    }
  }

}
