import { Scene } from './nodes/Scene';
import { Color } from './resources/Color';
import { atlasCleanup } from './resources/Texture';
import { Vec2 } from './resources/Vec';
import { System } from './systems/System';
import { Drawable } from './util/Drawable';
import { lerp } from './util/math';
import { AnyConstructorFor } from './util/types';

interface PeekStartupOptions {
  /** The canvas to render on. If none is provided, one is made. */
  canvas?: HTMLCanvasElement,

  /**
   * The screen's size
   * 
   * Adaptive: makes both sides average to the given
   * pixel length, retaining pixel count in the process.
   * 
   * Strict: keeps a specific width and height, padding the sides
   * with black bars to compensate for different aspect ratios.
   */
  size?: {
    width: number,
    height: number,
    adaptive?: boolean
  },

  /** Whether or not the canvas should be pixelated. Defaults to false */
  pixelated?: boolean,

  /** Whether or not the engine should go fullscreen. Defaults to false. */
  fullScreen?: boolean,

  /** The startup scene */
  startupScene?: AnyConstructorFor<Scene>,
}

/** The main Peek engine class */
class PeekMain {

  // CANVAS

  /** The canvas */
  private static canvas: HTMLCanvasElement;

  /** The rendering context! */
  public static ctx: CanvasRenderingContext2D & {
    webkitImageSmoothingEnabled?: boolean,
    mozImageSmoothingEnabled   ?: boolean,
    imageSmoothingEnabled      ?: boolean,
  };

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
  public static enableSystems(...newSystems: AnyConstructorFor<System>[]) {
    newSystems.map(s => this.enableSystem(s));
  }

  /** Enables a single system with its corresponding */
  public static enableSystem<T extends System>(
    newSystem: AnyConstructorFor<T>,
    ...args: ConstructorParameters<AnyConstructorFor<T>>
  ) {
    // Ensure the system hasn't been enabled already
    if (this.getSystem(newSystem) !== undefined) { return; }

    // Instantiate and append the new system
    const system = new newSystem(...args);
    const systemName = newSystem.name;

    // Enable its required systems
    this.enableSystems(
      ...system.requiredSystems
    );

    if (this.systems.list.length == 0) {
      // Edge case, first system
      this.systems.list.push(system);
      this.systems.map.set(systemName, system);
      return;
    }

    // Binary search for priority
    let startIdx = 0;
    let endIdx = this.systems.list.length - 1;
    let middleIdx = 0;
    const searchPriority = system.priority;

    while (Math.abs(startIdx - endIdx) > 1) {
      middleIdx = Math.floor((startIdx + endIdx) / 2);
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

  /**
   * Gets a system instance. Returns undefined if none exists.
   * @param system The type of the system
   * @returns The system instance (or undefined, if none was found)
   */
  public static getSystem<T extends System>(
    system: AnyConstructorFor<T>
  ): T | undefined {
    const systemName = system.name;
    return this.systems.map.get(systemName) as T;
  }

  // FRAME

  public static screenWidth = 128;
  public static screenHeight = 128;
  public static center: Readonly<Vec2> = new Vec2(
    this.screenWidth / 2,
    this.screenHeight / 2
  );

  private static screenDidResize = false;
  private static targetWidth: number;
  private static targetHeight: number;
  private static isSizeAdaptive: boolean;

  private static frameXOffset: number;
  private static frameYOffset: number;
  private static barRightSize: number;
  private static barBottomSize: number;

  private static finalDrawX = 0;
  private static finalDrawY = 0;

  /** The amount of frames elapsed since the start of the engine */
  public static frameCount = 0;
  public static frameRate = 0;
  public static smoothFrameRate = 0;

  public static delta = 0.1;
  private static lastFrameTime: number;
  public static smoothDelta = 1;

  private static singlePixelImageData: ImageData;

  /** Sets the screen size in pixels */
  public static screenSize(width: number, height: number) {
    this.screenWidth = width;
    this.screenHeight = height;
    this.center.set(width / 2, height / 2);
  }

  /** Starts the game engine */
  public static start(game: Scene, options: PeekStartupOptions = {}) {
    // Setup sizing
    if (options.size) {
      this.targetWidth = options.size.width;
      this.targetHeight = options.size.height;
      this.isSizeAdaptive = options.size.adaptive ?? false;
    } else {
      this.targetWidth = 128;
      this.targetHeight = 128;
      this.isSizeAdaptive = false;
    }

    // Setup the canvas
    if (options.canvas) {
      this.canvas = options.canvas;
    } else {
      this.canvas = document.createElement('canvas');
      document.body.style.cssText =
        'width:100vw;height:100vh;margin:0;padding:0;';
      this.canvas.style.width = '100vw';
      this.canvas.style.height = '100vh';
      document.body.appendChild(this.canvas);
    }
    this.canvas.style.imageRendering = 'pixelated';
    window.addEventListener('resize', () => this.screenDidResize = true);
    this.doScreenResize();

    // Setup the context
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.ctx.webkitImageSmoothingEnabled = false;
    this.ctx.mozImageSmoothingEnabled = false;
    this.ctx.imageSmoothingEnabled = false;
    this.singlePixelImageData = this.ctx.createImageData(1, 1);

    if (options.startupScene) {
      // Not in debug mode, so load the startup scene
      this.loadScene(new options.startupScene(game));
    } else {
      // Don't do the startup scene
      this.loadScene(game);
    }

    // Start the frame loop
    this.lastFrameTime = performance.now();
    window.requestAnimationFrame(this.frameCallback);
  }

  /** Used to initialize the frame loop */
  private static frameCallback() {
    // Calculate framerate and delta
    const nowTime = performance.now();
    Peek.delta = (nowTime - Peek.lastFrameTime) / 16.6666666;
    Peek.frameRate = 60 / Peek.delta;
    Peek.smoothFrameRate = lerp(Peek.smoothFrameRate, Peek.frameRate, 0.05);
    Peek.smoothDelta = lerp(Peek.smoothDelta, Peek.delta, 0.3);
    Peek.lastFrameTime = nowTime;

    // Call the frame function
    Peek.frame(Peek.smoothDelta > 3 ? 3 : Peek.smoothDelta);

    // Start the next frame (recursive)
    window.requestAnimationFrame(Peek.frameCallback);
  }

  /** Runs every time the window is resized, and once when Peek initializes */
  private static doScreenResize() {
    if (this.isSizeAdaptive) {
      // Adaptive (keep total pixel area)

      this.barRightSize = 0;
      this.barBottomSize = 0;
      this.frameXOffset = 0;
      this.frameYOffset = 0;

      const targetPixelArea = this.targetWidth * this.targetHeight;
      const realPixelArea = window.innerWidth * window.innerHeight;

      const sizeDown = Math.sqrt(targetPixelArea / realPixelArea);
      this.screenWidth = this.canvas.width =
        Math.round(window.innerWidth * sizeDown);
      this.screenHeight = this.canvas.height =
        Math.round(window.innerHeight * sizeDown);
    } else {
      // Strict sizing (black bars)

      this.screenWidth = this.targetWidth;
      this.screenHeight = this.targetHeight;

      const targetAspectRatio = this.targetWidth / this.targetHeight;
      const realAspectRatio = window.innerWidth / window.innerHeight;

      if (realAspectRatio > targetAspectRatio) {
        this.canvas.width = this.targetHeight * realAspectRatio;
        this.canvas.height = this.targetHeight;

        const barSize = ~~((this.canvas.width - this.targetWidth) / 2);
        this.barRightSize = this.canvas.width - barSize - this.targetWidth;
        this.barBottomSize = 0;

        this.frameXOffset = barSize;
        this.frameYOffset = 0;
      } else {
        this.canvas.width = this.targetWidth;
        this.canvas.height = this.targetWidth / realAspectRatio;

        const barSize = ~~((this.canvas.height - this.targetHeight) / 2);
        this.barBottomSize = this.canvas.height - barSize - this.targetHeight;
        this.barRightSize = 0;

        this.frameYOffset = barSize;
        this.frameXOffset = 0;
      }
    }

    this.screenDidResize = false;
  }

  /** Runs every frame */
  private static frame(
    delta: number,
    shouldProcessNodes: boolean = true,
    processSystemPriorityLessThan: number = Infinity
  ) {
    const scene = this.scenes[this.loadedSceneID];

    if (this.screenDidResize) {
      // Handle screen resize
      this.doScreenResize();
    }

    if (scene !== 0) {
      // The scene is loaded!
      
      // PROCESS

      // Call the systems (already ordered by priority)
      for (const system of this.systems.list) {
        if (system.priority >= processSystemPriorityLessThan) {
          break;
        }
        system.process(delta);
      }

      if (shouldProcessNodes) {
        // Process the camera nodes
        for (const [, ref] of scene.cameras) {
          ref.deref()?.cameraProcess(delta);
        }

        // Process the scene nodes
        scene.processCaller(delta);
      }


      // DRAW

      // Clear the screen
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Transform into place (for black bars)
      this.ctx.translate(this.frameXOffset, this.frameYOffset);

      // Translate (camera)
      const camera = scene.getCamera();
      if (camera) {
        camera.doTransform();
      }

      const transform = this.ctx.getTransform();
      this.finalDrawX = transform.e;
      this.finalDrawY = transform.f;

      // Draw the scene
      scene.drawCaller();
      
      // Reset the transform
      this.ctx.resetTransform();

      // Draw black bars
      this.ctx.fillStyle = '#000';

      if (this.frameXOffset || this.barRightSize) {
        this.ctx.fillRect(0, 0, this.frameXOffset, this.canvas.height);
        this.ctx.fillRect(
          this.canvas.width - this.barRightSize, 0,
          this.barRightSize, this.canvas.height
        );
      } else if (this.frameYOffset || this.barBottomSize) {
        this.ctx.fillRect(0, 0, this.canvas.width, this.frameYOffset);
        this.ctx.fillRect(
          0, this.canvas.height - this.barBottomSize,
          this.canvas.width, this.barBottomSize
        );
      }
    } else {
      // Draw black over the screen
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Cleanup the atlas
    atlasCleanup();

    // Increment the frame
    this.frameCount++;
  }

  /** Gets the currently-loaded scene */
  public static getScene(): Scene | undefined {
    const scene = this.scenes[this.loadedSceneID];
    if (scene === 0) {
      return undefined;
    } else {
      return scene;
    }
  }

  /** Loads a scene and switches to it */
  public static loadScene(scene: Scene) {
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
    await scene.preloadCaller();

    // TODO: Make sure the scene's assets are loaded (somehow)

    // Call the scene's ready function!
    scene.readyCaller();

    // Finally, add the scene
    this.scenes[scene.sceneID] = scene;
  }

  // DRAW HELPERS

  /** Sets a single pixel from the canvas. This is a full replace! */
  public static setPixel(x: number, y: number, color: Color) {
    this.ctx.clearRect(~~x, ~~y, 1, 1);
    this.ctx.fillStyle = color.fillStyle();
    this.ctx.fillRect(~~x, ~~y, 1, 1);
  }
  /** Sets a single pixel from the canvas. This is a full replace! */
  public static setPixelRaw(x: number, y: number, color: Uint8ClampedArray) {
    this.singlePixelImageData.data.set(color);
    this.ctx.putImageData(this.singlePixelImageData, x, y);
  }

  /** Gets a single pixel from the canvas. */
  public static getPixel(x: number, y: number): Color {
    const data = this.ctx.getImageData(x, y, 1, 1).data;
    return new Color(data[0], data[1], data[2], data[3]);
  }
  /** Gets a single pixel from the canvas. */
  public static getPixelRaw(x: number, y: number): Uint8ClampedArray {
    return this.ctx.getImageData(x, y, 1, 1).data;
  }

  /** Erases everything that falls inside this rectangle. */
  public static clearRect(
    x: number, y: number,
    width: number, height: number
  ): void {
    this.ctx.clearRect(x, y, width, height);
  }

  /** Draws a filled rectangle given the top left point, width, and height. */
  public static fillRect(x: number, y: number, width: number, height: number) {
    this.ctx.fillRect(x, y, width, height);
  }
  
  /** Draws a rectangle outline given the top left point, width, and height. */
  public static rect(x: number, y: number, width: number, height: number) {
    this.ctx.beginPath();
    this.ctx.rect(
      Math.floor(x) + 0.5,
      Math.floor(y) + 0.5,
      ~~width - 1,
      ~~height - 1
    );
    this.ctx.stroke();
  }

  /** Draws a centered circle at the given position. */
  public static circle(x: number, y: number, radius: number) {
    [this.ctx.fillStyle, this.ctx.strokeStyle] =
      [this.ctx.strokeStyle, this.ctx.fillStyle];
    
    x = Math.floor(x);
    y = Math.floor(y);
    radius = ~~radius;

    let last = radius - 1;
    for (let p = 0; p < radius; p++) {
      const f = p / (radius - 1);
      const h = ~~(Math.sqrt(1 - f ** 2) * radius);
      const colHeight = (last - h) || 1;

      this.fillRect(
        x + p,
        y + h,
        1, colHeight
      );
      this.fillRect(
        x + p,
        y - h,
        1, -colHeight
      );
      this.fillRect(
        x - p,
        y + h,
        1, colHeight
      );
      this.fillRect(
        x - p,
        y - h,
        1, -colHeight
      );

      last = h;
    }

    [this.ctx.fillStyle, this.ctx.strokeStyle] =
      [this.ctx.strokeStyle, this.ctx.fillStyle];
  }

  /**
   * Draws a line using EFLA Variation D
   * 
   * Source: http://www.edepot.com/lined.html
   * 
   * @param x1 The line's start X
   * @param y1 The line's start Y
   * @param x2 The line's end X
   * @param y2 The line's end Y
   */
  public static line(x1: number, y1: number, x2: number, y2: number) {
    [this.ctx.fillStyle, this.ctx.strokeStyle] =
      [this.ctx.strokeStyle, this.ctx.fillStyle];
    
    x1 = ~~x1;
    x2 = ~~x2;
    y1 = ~~y1;
    y2 = ~~y2;

    let shortLen = y2 - y1;
    let longLen = x2 - x1;

    let yLonger: boolean;
    if (Math.abs(shortLen) > Math.abs(longLen)) {
      const swap = shortLen;
      shortLen = longLen;
      longLen = swap;
      yLonger = true;
    } else {
      yLonger = false;
    }

    const endVal = longLen;

    let incrementVal: number;
    if (longLen < 0) {
      incrementVal = -1;
      longLen = -longLen;
    } else {
      incrementVal = 1;
    }

    const decInc: number = longLen == 0
      ? 0
      : Math.floor((shortLen << 16) / longLen);

    let j = 0;
    if (yLonger) {
      for (let i = 0; i !== endVal; i += incrementVal) {
        this.ctx.fillRect(x1 + (j >> 16), y1 + i, 1, 1);
        j += decInc;
      }
    } else {
      for (let i = 0; i !== endVal; i += incrementVal) {
        this.ctx.fillRect(x1 + i, y1 + (j >> 16), 1, 1);
        j += decInc;
      }
    }

    [this.ctx.fillStyle, this.ctx.strokeStyle] =
      [this.ctx.strokeStyle, this.ctx.fillStyle];
  }

}
export const Peek: (typeof PeekMain) & Drawable = PeekMain;

// Expose the engine!
window.Peek = Peek;
