import { Module } from '../src/Module.ts';
import { Engine } from '../src/mod.ts';
import { DefaultModule } from '../src/modules/DefaultModule.ts';
import { Frame } from '../src/modules/Frame.ts';

// A point type, which holds 3D coordinates
type Point = [number, number, number];

/** The demo module */
class Demo3D extends Module {
  public static points: Point[] = [];

  /** Runs when the module is initiated */
  public static init() {
    super.init();

    // Make `this.frame()` run every frame
    Frame.addFrameFunction(this.frame);

    // Initialize a few random points
    for (let a = 0; a < 30; a++) {
      this.points.push([
        Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5
      ]);
    }

    return this;
  }

  /** Draws lines every frame */
  public static frame() {
    // Project the points to 2D space
    const projectedPoints = this.points.map(point => {
      return project(point, Frame.frameCount / 30);
    });

    // Draw lines connecting the points
    for (let p = 0; p < projectedPoints.length - 1; p++) {
      Frame.line(...projectedPoints[p], ...projectedPoints[p + 1]);
    }
  }
}

/** Projects a point from 3D to 2D */
function project(p: Point, angle: number): [number, number] {
  // Ooh fancy math
  const x = p[0] * Math.cos(angle) - p[2] * Math.sin(angle);
  const y = p[1];
  const z = p[0] * Math.sin(angle) + p[2] * Math.cos(angle);

  const zoom = 50;
  const zPush = 1;
  return [
    (x / (z + zPush)) * zoom + Frame.width / 2,
    (y / (z + zPush)) * zoom + Frame.height / 2
  ];
}

/*
 * This bit here initializes the engine.
 * 
 * First, we tell it to load the default module, which itself initializes a few
 * modules. We pass it the CSS selector for the canvas we're rendering to
 * (defined in `index.spl`).
 * 
 * Then, we tell the engine to load our default module,
 * which initializes itself.
 */

Engine
  .module(DefaultModule, '#cnv')
  .module(Demo3D);
