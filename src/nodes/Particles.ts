import { Peek } from '../peek';
import { Color } from '../resources/Color';
import { Vec2 } from '../resources/Vec';
import { lerp } from '../util/math';
import { PNode } from './PNode';

interface SingleParticle {
  x: number, y: number,
  xVel: number, yVel: number,
  sizeBegin: number, sizeEnd: number,
  color: Color,
  maxLifetime: number, currLifetime: number
}

/**
 * A simple, drop-in particle system. This was tested on a decent computer and
 * ran a maximum of around 84,000 particles without dropping under 60 fps.
 */
export class Particles extends PNode {
  /** All the particles */
  private particles: Set<SingleParticle> = new Set();

  /** An offset applied to particles before they're rendered */
  public offset = Vec2.zero();

  /** The gravity applied to particles each processing frame */
  public gravity: Vec2 = new Vec2(0, 0.1);

  /** The particle's color */
  public color: Color = Color.WHITE;

  /** Animates the particles */
  protected override process(delta: number): void {
    // Particle physics
    for (const p of this.particles) {
      p.x += p.xVel * delta;
      p.y += p.yVel * delta;

      p.xVel += this.gravity.x * delta;
      p.yVel += this.gravity.y * delta;

      // End of lifetime
      p.currLifetime += delta;
      if (p.currLifetime > p.maxLifetime) {
        this.particles.delete(p);
      }
    }
  }

  /** Emits a single particle */
  public emit(
    position: [number, number],
    velocity: [number, number],
    velocityVariation: [number, number],
    sizeBegin: number,
    sizeEnd: number,
    color: Color,
    lifetime: number,
    count: number
  ): void {
    for (let i = 0; i < count; i++) {
      this.particles.add({
        x: position[0], y: position[1],
        xVel: velocity[0] + (Math.random() - 0.5) * 2.0 * velocityVariation[0],
        yVel: velocity[1] + (Math.random() - 0.5) * 2.0 * velocityVariation[1],
        sizeBegin, sizeEnd,
        color,
        maxLifetime: lifetime,
        currLifetime: 0
      });
    }
  }

  /**
   * Emits a simple particle! This particle's speed is specified by the
   * parameter, and will be emitted in a random XY direction.
   * @param position The position to emit the particle at
   * @param speed The magnitude of the velocity vector
   * @param color The color of the particle
   */
  public simpleEmit(
    position: [number, number],
    speed: number = 1.0,
    color: Color = Color.WHITE,
    count: number = 2
  ) {
    this.emit(
      position,
      [ 0, 0 ],
      [ speed, speed ],
      3,
      0.6,
      color,
      40,
      count
    );
  }

  /** Draws the particles */
  protected override draw() {
    Peek.ctx.fillStyle = this.color.fillStyle();
    for (const p of this.particles) {
      const lifetime = p.currLifetime / p.maxLifetime;

      const sz = Math.ceil(lerp(p.sizeBegin, p.sizeEnd, lifetime));
      Peek.ctx.fillRect(
        Math.floor(p.x - sz / 2 + this.offset.x),
        Math.floor(p.y - sz / 2 + this.offset.y),
        sz, sz
      );
    }
  }

}
