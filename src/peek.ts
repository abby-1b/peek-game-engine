import { Scene } from './nodes/Scene';
import { StartupScene } from './resources/StartupScene';
import { atlasCleanup } from './resources/Texture';
import { Vec2 } from './resources/Vec';

interface PeekStartupOptions {
  /** The canvas to render on. If none is provided, one is made. */
  canvas?: HTMLCanvasElement,

  /** If the engine should try going fullscreen. Defaults to false. */
  fullScreen?: boolean,
}

/** The main Peek engine class */
export class Peek {
  /** The canvas */
  private static canvas: HTMLCanvasElement;

  /** The rendering context! */
  public static ctx: CanvasRenderingContext2D;

  /** The currently loaded scene */
  private static loadedSceneID = -1;

  /** The currently loaded scenes */
  public static scenes: Record<number, Scene | 0> = {};

  public static readonly screenWidth = 128;
  public static readonly screenHeight = 128;
  public static readonly center: Readonly<Vec2> = new Vec2(
    this.screenWidth / 2,
    this.screenHeight / 2
  );

  /** The amount of frames elapsed since the start of the engine */
  public static frameCount: number = 0;

  /** Sets the screen size in pixels */
  public static screenSize(width: number, height: number) {
    (this as {screenWidth: number}).screenWidth = width;
    (this as {screenHeight: number}).screenHeight = height;
    this.center.set(width / 2, height / 2);
  }

  /** Starts the game engine */
  public static start(game: Scene, options: PeekStartupOptions = {}) {
    // Setup the canvas
    if (options.canvas) {
      this.canvas = options.canvas;
    } else {
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.screenWidth;
      this.canvas.height = this.screenHeight;
      document.body.style.cssText =
        'width:100vw;height:100vh;margin:0;padding:0;';
      this.canvas.style.width = '100vw';
      this.canvas.style.height = '100vh';
      this.canvas.style.imageRendering = 'pixelated';
      document.body.appendChild(this.canvas);
    }

    // Setup the context
    this.ctx = this.canvas.getContext('2d')!;

    this.loadScene(new StartupScene(game));

    // Start the frame loop
    setInterval(() => this.frame(), 1000 / 60);
  }

  /** Runs every frame */
  private static frame() {
    if (this.scenes[this.loadedSceneID] !== 0) {
      // The scene is loaded!

      // Clear the screen
      this.ctx.clearRect(0, 0, this.screenWidth, this.screenHeight);

      // Draw the scene
      (this.scenes[this.loadedSceneID] as unknown as {drawCaller: () => void})
        .drawCaller();
    }

    /*
    // DEBUG: draw texture atlas rects
    const colors = [
      [ '#00ff00', '#00dd00', '#00bb00', '#009900' ],
      [ '#ff0000', '#dd0000', '#bb0000', '#990000' ]
    ];
    let i = 0;
    for (const rect of freeRects) {
      this.ctx.fillStyle = 'none';
      this.ctx.strokeStyle = colors[0][i % colors[0].length];
      this.ctx.beginPath();
      this.ctx.rect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
      this.ctx.stroke();
      rect.idx = i;
      this.ctx.strokeText(i + '', rect.x + 2, rect.y + 8.5);
      i++;
    }
    i = 0;
    for (const rect of usedRects) {
      this.ctx.fillStyle = 'none';
      this.ctx.strokeStyle = colors[1][i % colors[0].length];
      this.ctx.beginPath();
      this.ctx.rect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
      this.ctx.stroke();
      rect.idx = i;
      this.ctx.strokeText(i + '', rect.x + 2, rect.y + 8.5);
      i++;
    }
    // For (let i = 0; i < 3; i++) atlasCleanup();
    */

    // Cleanup the atlas
    atlasCleanup();

    // Increment the frame
    (this as {frameCount: number}).frameCount++;
  }

  /** Loads a scene and switches to it */
  public static loadScene(scene: Scene) {
    console.log('Loaded', scene);

    // Pre-load the scene, but don't wait for it!
    this.preLoadScene(scene);

    // This scene is the one being drawn now!
    this.loadedSceneID = scene.sceneID;
  }

  /**
   * Preloads a scene. This calls `.preload()`!
   */
  public static async preLoadScene(scene: Scene) {
    if (this.scenes[scene.sceneID] !== undefined) {
      // This scene is already being loaded!
      return;
    }

    // Let other functions know that the scene is being loaded!
    this.scenes[scene.sceneID] = 0;

    // Wait for the scene's preload function
    await (scene as unknown as {preload: () => Promise<void>}).preload();

    // TODO: Make sure the scene's assets are loaded (somehow)

    // Finally, add the scene
    this.scenes[scene.sceneID] = scene;
  }

}

// Expose the engine!
(window as unknown as {Peek: Peek}).Peek = Peek;
