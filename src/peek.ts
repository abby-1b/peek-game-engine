import { Scene } from './nodes/Scene';
import { StartupScene } from './resources/StartupScene';
import { atlasCleanup } from './resources/Texture';
import { Vec2 } from './resources/Vec';
import { Debugger } from './util/debugger';
import { System } from './systems/System';
import { AnyConstructorFor as Constructor } from './util/types';

interface PeekStartupOptions {
  /** The canvas to render on. If none is provided, one is made. */
  canvas?: HTMLCanvasElement,

  /** If the engine should try going fullscreen. Defaults to false. */
  fullScreen?: boolean,

  /** If the engine should enable debug tools */
  debug?: boolean,
}

/** The main Peek engine class */
export class Peek {

  /**  */
  private static debugTest(a: number): number {
    return a + 123;
  }

  // CANVAS

  /** The canvas */
  private static canvas: HTMLCanvasElement;

  /** The rendering context! */
  public static ctx: CanvasRenderingContext2D;

  // SCENE

  /** The currently loaded scene */
  private static loadedSceneID = -1;

  /** The currently loaded scenes */
  public static scenes: Record<number, Scene | 0> = {};

  // SYSTEMS
  private static systems: { list: System[], map: Map<string, System> } = {
    list: [],
    map: new Map()
  };

  /** Enables a list of systems */
  public static enableSystems(...newSystems: Constructor<System>[]) {
    for (const newSystem of newSystems) {
      // Ensure the system hasn't been enabled already
      if (this.getSystem(newSystem) !== undefined) continue;
      
      // Instantiate and append the new system
      const system = new newSystem();
      const systemName = newSystem.name;

      this.enableSystems(...system.requiredSystems as Constructor<System>[]);

      if (this.systems.list.length == 0) {
        // Edge case, first system
        this.systems.list.push(system);
        this.systems.map.set(systemName, system);
        continue;
      }

      // Binary search for priority
      let startIdx = 0;
      let endIdx = this.systems.list.length - 1;
      let middleIdx = 0;
      const searchPriority = system.priority;

      while (Math.abs(startIdx - endIdx) > 1) {
        middleIdx = ~~((startIdx + endIdx) / 2);
        const middlePriority = this.systems.list[middleIdx].priority;

        if (middlePriority > searchPriority) {
          endIdx = middleIdx;
        } else if (middlePriority < searchPriority) {
          startIdx = middleIdx;
        } else {
          break;
        }
      }

      // Insert the item
      this.systems.list.splice(middleIdx, 0, system);
      this.systems.map.set(systemName, system);
    }
  }

  /**
   * Gets a system instance. Returns undefined if none exists.
   * @param system The type of the system
   * @returns The system instance (or undefined, if none was found)
   */
  public static getSystem<T extends System>(
    system: Constructor<T>
  ): T | undefined {
    const systemName = system.name;
    return this.systems.map.get(systemName) as T;
  }

  // FRAME

  public static readonly screenWidth = 128;
  public static readonly screenHeight = 128;
  public static readonly center: Readonly<Vec2> = new Vec2(
    this.screenWidth / 2,
    this.screenHeight / 2
  );

  /** The amount of frames elapsed since the start of the engine */
  public static frameCount: number = 0;
  public static frameRate: number = 0;

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

    if (options.debug) {
      // Debug mode!
      Debugger.init();

      // Don't do the startup scene, so we don't go mad
      this.loadScene(game);
    } else {
      // Not in debug mode, so load the startup scene
      this.loadScene(new StartupScene(game));
    }

    // Start the frame loop
    const targetDelta = 1000 / 60;
    let lastFrameTime = performance.now();
    setInterval(() => {
      const nowTime = performance.now();
      const delta = (nowTime - lastFrameTime) / 16.66;
      this.frameRate = this.frameRate * 0.9 + (60 / delta) * 0.1;
      this.frame(delta > 5 ? 5 : delta);
      lastFrameTime = nowTime;
    }, targetDelta);
  }

  /** Runs every frame */
  private static frame(delta: number) {
    const scene = this.scenes[this.loadedSceneID];
    if (scene !== 0) {
      // The scene is loaded!

      // Clear the screen
      this.ctx.clearRect(0, 0, this.screenWidth, this.screenHeight);

      // Process the scene...
      (scene as unknown as {processCaller: (delta: number) => void})
        .processCaller(delta);

      // Call the systems (already ordered by priority)
      for (const system of this.systems.list) {
        system.process(delta);
      }

      // Draw the scene
      (scene as unknown as {drawCaller: () => void})
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

    // Call the scene's ready function!
    (scene as unknown as {ready: () => void}).ready();

    // Finally, add the scene
    this.scenes[scene.sceneID] = scene;
  }

}

// Expose the engine!
(window as unknown as { Peek: Peek }).Peek = Peek;
