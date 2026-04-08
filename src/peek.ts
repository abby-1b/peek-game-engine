import { PNodeState } from './nodes/PNode';
import { Scene } from './nodes/Scene';
import { Color } from './resources/Color';
import { atlasCleanup } from './resources/Texture';
import { Vec2 } from './resources/Vec';
import { BlendMode } from './util/BlendMode';
import { BaseDrawWritable, DrawWritable } from './util/Drawable';
import { lerp, millisToDelta } from './util/math';
import { Queue } from './util/Queue';
import { AnyConstructorFor } from './util/types';

const SCENE_LOADING_FLAG = 0;

interface PeekStartupOptions {
  /** The canvas to render on. If none is provided, one is made. */
  canvas?: HTMLCanvasElement;

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
    width: number;
    height: number;
    adaptive?: boolean;
  };

  /** Whether or not the canvas should be pixelated. Defaults to true */
  pixelated?: boolean;

  /** Whether or not nodes should snap to the pixel grid (scaled up or not) */
  snapToGrid?: boolean;

  /** Whether or not the engine should go fullscreen. Defaults to false. */
  fullScreen?: boolean;

  /** The startup scene */
  startupScene?: AnyConstructorFor<Scene>;

  advanced?: {
    /**
     * Deferred tasks will only run within this percent of a frameTime.
     * This is done so deferred tasks can take a little longer than expected
     * without causing frames to drop.
     * If frames start dropping due to deferred tasks, decrease this value.
     */
    deferredTaskUptime?: number;
  };
}

interface DeferredTask {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  taskFn: Generator<any, any, any>;

  /** How long this task took to execute the last time it was ran */
  lastExecTime: number;
}
type DeferredGenerator = Generator<unknown, unknown, unknown>;

/** The main Peek engine class */
class PeekMain {
  // CANVAS

  /** The canvas */
  private static canvas: HTMLCanvasElement;

  /** The rendering context! */
  private static ctx: CanvasRenderingContext2D & {
    webkitImageSmoothingEnabled?: boolean;
    mozImageSmoothingEnabled?: boolean;
    imageSmoothingEnabled?: boolean;
  };

  // SCENE

  /** The currently loaded scene */
  private static activeSceneID = -1;

  /** The currently loaded scenes */
  public static scenes: Record<number, Scene | 0> = {};

  // FRAME

  public static screenWidth = 128;
  public static screenHeight = 128;
  public static center: Readonly<Vec2> = new Vec2(
    this.screenWidth / 2,
    this.screenHeight / 2,
  );

  private static screenDidResize = false;
  private static targetWidth: number;
  private static targetHeight: number;
  private static isSizeAdaptive: boolean;

  /** Multiplier for how many times the process loop runs per unit time */
  private static fastForwardMultiplier: number = 1;

  /**
   * When 1, texture pixels match their texture size. Otherwise,
   * scales drawn pixels to occupy this many screen pixels.
   */
  private static pixelScale = 1;

  /** Gets how much pixels should be scaled before being drawn to the screen */
  public static getPixelScale() {
    return this.pixelScale;
  }

  public static snapToGrid = true;

  public static frameXOffset: number;
  public static frameYOffset: number;
  private static barRightSize: number;
  private static barBottomSize: number;

  /** The amount of frames elapsed since the start of the engine */
  public static frameCount = 0;
  public static frameRate = 0;
  public static smoothFrameRate = 0;
  private static frameStartTime = 0;

  private static postFrameFns = new Queue<() => Promise<void>>();

  /**
   * The amount of time passed since the last frame,
   * scaled to be 1 when the framerate is 60 FPS.
   */
  public static delta = 1;
  private static processDeltaErr = 1;
  private static lastFrameTime: number;
  public static smoothDelta = 1;

  private static singlePixelImageData: ImageData;

  public static backgroundColor = Color.WHITE;

  private static deferredTasks = new Queue<DeferredTask>();

  /** @internal */
  public static _sceneProcessStack: number[] = [];

  /** Gets how many deferred tasks are currently in queue */
  public static getDefferedTaskCount() {
    return this.deferredTasks.length;
  }
  public static deferredTaskUptime = 1.1;

  /** Sets the screen size in pixels */
  public static screenSize(width: number, height: number) {
    this.screenWidth = width;
    this.screenHeight = height;
    this.center.set(width / 2, height / 2);
  }

  /** Starts the game engine */
  public static async start(game: Scene, options: PeekStartupOptions = {}) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).fetchRelativeTo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).fetchRelativeTo = '';
    }

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

    // Pixelated handling
    this.snapToGrid = options.snapToGrid ?? true;
    this.canvas.style.imageRendering = 'pixelated';
    if (options.pixelated ?? true) {
      // Keep the screen size proper and pixelate draw calls
    } else {
      // Smooth pixels! Everything smooth!
      this.pixelScale = 8; // TODO: make this configurable
    }

    // Setup the context
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.singlePixelImageData = this.ctx.createImageData(1, 1);

    // Resize handlers
    window.addEventListener('resize', () => (this.screenDidResize = true));
    this.doScreenResize();

    if (options.startupScene) {
      // Not in debug mode, so load the startup scene
      this.switchScene(new options.startupScene(game));
    } else {
      // Don't do the startup scene
      this.switchScene(game);
    }

    if (options.advanced) {
      this.deferredTaskUptime =
        options.advanced.deferredTaskUptime ?? this.deferredTaskUptime;
    }

    // Start the frame loop
    this.lastFrameTime = performance.now();
    window.requestAnimationFrame(this.frameCallback);
  }

  /** Used to initialize the frame loop */
  private static frameCallback() {
    // Calculate framerate and delta
    const nowTime = (Peek.frameStartTime = performance.now());
    Peek.delta = millisToDelta(nowTime - Peek.lastFrameTime);
    if (Peek.delta > 0) {
      Peek.frameRate = 60 / Peek.delta;
      Peek.smoothFrameRate = lerp(Peek.smoothFrameRate, Peek.frameRate, 0.05);
      Peek.smoothDelta = lerp(Peek.smoothDelta, Peek.delta, 0.3);
    }
    Peek.lastFrameTime = nowTime;

    // Call the frame function
    Peek.frame();

    // Start the next frame (recursive)
    window.requestAnimationFrame(Peek.frameCallback);
    // setTimeout(() => Peek.frameCallback(), 0);
  }

  /** Runs every time the window is resized, and once when Peek initializes */
  private static doScreenResize() {
    const { targetWidth, targetHeight, pixelScale, isSizeAdaptive } = this;
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    let finalWidth: number;
    let finalHeight: number;

    if (isSizeAdaptive) {
      // Adaptive: keep total pixel area, no black bars
      this.barRightSize =
        this.barBottomSize =
        this.frameXOffset =
        this.frameYOffset =
          0;
      const sizeDown = Math.sqrt((targetWidth * targetHeight) / (winW * winH));
      this.screenWidth = finalWidth = Math.round(winW * sizeDown);
      this.screenHeight = finalHeight = Math.round(winH * sizeDown);
    } else {
      // Strict: preserve target aspect ratio with black bars
      this.screenWidth = targetWidth;
      this.screenHeight = targetHeight;

      const targetAspect = targetWidth / targetHeight;
      const realAspect = winW / winH;

      if (realAspect > targetAspect) {
        // Black bars on left/right
        finalWidth = targetHeight * realAspect;
        finalHeight = targetHeight;
        const newCanvasWidth = finalWidth * pixelScale;
        const scaledTargetWidth = targetWidth * pixelScale;
        const barSize = ~~((newCanvasWidth - scaledTargetWidth) / 2);
        this.barRightSize = newCanvasWidth - barSize - scaledTargetWidth;
        this.barBottomSize = 0;
        this.frameXOffset = barSize;
        this.frameYOffset = 0;
      } else {
        // Black bars on top/bottom
        finalWidth = targetWidth;
        finalHeight = targetWidth / realAspect;
        const newCanvasHeight = finalHeight * pixelScale;
        const scaledTargetHeight = targetHeight * pixelScale;
        const barSize = ~~((newCanvasHeight - scaledTargetHeight) / 2);
        this.barBottomSize = newCanvasHeight - barSize - scaledTargetHeight;
        this.barRightSize = 0;
        this.frameYOffset = barSize;
        this.frameXOffset = 0;
      }
    }

    this.canvas.width = finalWidth * pixelScale;
    this.canvas.height = finalHeight * pixelScale;
    this.screenDidResize = false;

    // Disable image smoothing for pixelated rendering
    const ctx = this.ctx;
    ctx.webkitImageSmoothingEnabled =
      ctx.mozImageSmoothingEnabled =
      ctx.imageSmoothingEnabled =
        false;
  }

  /** Runs every frame */
  private static frame(
    shouldProcessNodes: boolean = true,
    processSystemPriorityLessThan: number = Infinity,
  ) {
    const scene = this.scenes[this.activeSceneID];

    if (this.screenDidResize) {
      // Handle screen resize
      this.doScreenResize();
    }

    if (scene !== 0 && scene !== undefined) {
      // The scene is loaded!

      // --- PROCESS ---

      this.processDeltaErr += this.delta;
      const processTicks = ~~this.processDeltaErr;
      this.processDeltaErr -= processTicks;
      for (
        let i = 0;
        i < Math.min(processTicks, 16) * this.fastForwardMultiplier;
        i++
      ) {
        // Call the systems (already ordered by priority)
        scene._processUnderPriority(processSystemPriorityLessThan);

        if (shouldProcessNodes) {
          // Process the scene nodes
          scene._processCaller();

          // Process the camera nodes
          scene._innerCamera?.cameraProcess(1);
        }
      }

      // --- DRAW ---

      // Clear the screen
      this.ctx.fillStyle = this.backgroundColor.fillStyle();
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Transform into place (for black bars)
      this.ctx.translate(this.frameXOffset, this.frameYOffset);
      this.ctx.scale(this.pixelScale, this.pixelScale);

      // Translate (camera)
      const camera = scene.getCamera();
      if (camera) {
        camera._doTransform();
      }

      // Draw the scene
      scene._drawCaller();

      // Reset the transform
      this.ctx.resetTransform();

      // Draw the UI (nodes inside the camera!)
      if (camera) {
        camera._drawCaller();
      }

      // Draw black bars
      this.ctx.fillStyle = '#000';

      if (this.frameXOffset || this.barRightSize) {
        this.ctx.fillRect(0, 0, this.frameXOffset, this.canvas.height);
        this.ctx.fillRect(
          this.canvas.width - this.barRightSize,
          0,
          this.barRightSize,
          this.canvas.height,
        );
      } else if (this.frameYOffset || this.barBottomSize) {
        this.ctx.fillRect(0, 0, this.canvas.width, this.frameYOffset);
        this.ctx.fillRect(
          0,
          this.canvas.height - this.barBottomSize,
          this.canvas.width,
          this.barBottomSize,
        );
      }
    } else {
      // Draw black over the screen
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Cleanup the atlas
    atlasCleanup();

    // Run deferred tasks
    const frameTime = 1000 / ((60 + this.smoothFrameRate) * 0.6);
    const endTime = Peek.frameStartTime + frameTime * this.deferredTaskUptime;
    let task = this.deferredTasks.peek();
    let count = 0;
    let now = performance.now();
    let toEnd = now;
    while (task !== undefined) {
      if (count !== 0 && now + task.lastExecTime >= endTime) {
        break;
      }
      const d = task?.taskFn.next().done;
      if (d) {
        this.deferredTasks.shift();
        task = this.deferredTasks.peek();
        toEnd = performance.now();
      } else {
        toEnd = performance.now();
        task.lastExecTime = 0.2 * (toEnd - now + 0.1) + 0.8 * task.lastExecTime;
      }
      now = toEnd;
      count++;
    }

    while (this.postFrameFns.length > 0) {
      const fn = this.postFrameFns.shift();
      if (fn) fn();
    }

    // Increment the frame
    this.frameCount++;
  }

  /** Gets the currently-loaded scene */
  public static getScene(): Scene | undefined {
    const scene = this.scenes[this.activeSceneID];
    if (scene === 0) {
      return undefined;
    } else {
      return scene;
    }
  }

  /**
   * Switches to a new scene at the end of the current frame,
   * unloading the current scene.
   */
  public static switchScene(scene: Scene) {
    this.postFrameFns.push(async () => {
      this.backgroundColor = Color.BLACK;

      // Preload the scene
      if (scene.state === PNodeState.IDLE) await this.preloadScene(scene);

      // Exit the current scene
      const currScene = this.scenes[this.activeSceneID];
      if (currScene) currScene._exitCaller();

      // Unload
      this.unloadScene(this.activeSceneID);

      // Set the new scene as the active one
      this.activeSceneID = scene.sceneID;
      scene._enterCaller();
    });
  }

  /**
   * Switches to a new scene at the end of the current frame,
   * keeping the current scene loaded.
   */
  public static switchSceneLazy(scene: Scene) {
    this.postFrameFns.push(async () => {
      // Preload the scene
      if (scene.state === PNodeState.IDLE) this.preloadScene(scene);

      // Exit the current scene
      const currScene = this.scenes[this.activeSceneID];
      if (currScene) currScene._exitCaller();

      // Set the new scene as the active one
      this.activeSceneID = scene.sceneID;
      scene._enterCaller();
    });
  }

  /**
   * Preloads a scene. This calls `.preload()`!
   */
  public static async preloadScene(scene: Scene) {
    if (this.scenes[scene.sceneID] !== undefined) {
      // This scene is already being loaded!
      return;
    }

    // Let other functions know that the scene is being loaded!
    this.scenes[scene.sceneID] = SCENE_LOADING_FLAG;

    await scene._preloadCaller();

    // Finally, add the scene
    this.scenes[scene.sceneID] = scene;
  }

  /** Unloads a scene, stopping all its internal listeners. */
  public static async unloadScene(sceneID: number) {
    const scene = this.scenes[sceneID];
    if (!scene) return;

    delete this.scenes[sceneID];
    if (this.activeSceneID === sceneID) {
      // Was loaded, so set to nothing!
      this.activeSceneID = -1;
    }
  }

  // --- DRAW HELPERS ---

  /** Gets the canvas transform */
  public static getTransform(): DOMMatrix {
    return this.ctx.getTransform();
  }

  /** Sets the canvas transform */
  public static setTransform(transform: DOMMatrix) {
    this.ctx.setTransform(transform);
  }

  /** Translates the canvas by a given amount */
  public static translate(x: number, y: number) {
    this.ctx.translate(x, y);
  }

  /** Flips the drawing direction horizontally */
  public static flipH() {
    this.ctx.scale(-1, 1);
  }

  /**
   * Sets the blend mode for future draw calls.
   * Make sure to reset it after use!
   */
  public static setBlendMode(blendMode: BlendMode) {
    this.ctx.globalCompositeOperation = blendMode;
  }

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

  /** Erases everything that falls inside this rectangle. */
  public static clearRect(
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    this.ctx.clearRect(x, y, width, height);
  }

  /** Draws a filled rectangle given the top left point, width, and height. */
  public static fillRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: Color,
  ) {
    this.ctx.fillStyle = color.fillStyle();
    this.ctx.fillRect(x, y, width, height);
  }

  /** Draws a rectangle outline given the top left point, width, and height. */
  public static rect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: Color,
  ) {
    this.ctx.strokeStyle = color.fillStyle();
    this.ctx.beginPath();
    this.ctx.rect(
      Math.floor(x) + 0.5,
      Math.floor(y) + 0.5,
      ~~width - 1,
      ~~height - 1,
    );
    this.ctx.stroke();
  }

  /** Draws a centered circle at the given position. */
  public static circle(x: number, y: number, radius: number, color: Color) {
    BaseDrawWritable.circle(this.ctx, x, y, radius, color);
  }

  /** Draws a centered, filled circle at the given position */
  public static fillCircle(x: number, y: number, radius: number, color: Color) {
    BaseDrawWritable.fillCircle(this.ctx, x, y, radius, color);
  }

  /** Draws a circle outline within a bounding box (opposite corners) */
  public static circleR(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: Color,
  ) {
    BaseDrawWritable.circleR(this.ctx, x0, y0, x1, y1, color);
  }

  /** Draws a filled circle within a bounding box (opposite corners) */
  public static fillCircleR(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: Color,
  ) {
    BaseDrawWritable.fillCircleR(this.ctx, x0, y0, x1, y1, color);
  }

  /** Draws a line */
  public static line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: Color,
  ) {
    if (this.pixelScale <= 1) {
      BaseDrawWritable.line(this.ctx, x1, y1, x2, y2, color);
    } else {
      this.ctx.strokeStyle = color.fillStyle();
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
      this.ctx.strokeStyle = '';
    }
  }
  /** Draws a thick line */
  public static thickLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number,
    color: Color,
  ) {
    BaseDrawWritable.thickLine(this.ctx, x1, y1, x2, y2, thickness, color);
  }

  public static drawImage(
    image: CanvasImageSource,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void;
  public static drawImage(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    swidth: number,
    sheight: number,
    dx: number,
    dy: number,
    dwidth: number,
    dheight: number,
  ): void;

  /** Draws an imagesource to the canvas */
  public static drawImage(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    swidth: number,
    sheight: number,
    dx?: number,
    dy?: number,
    dwidth?: number,
    dheight?: number,
  ) {
    if (dx === undefined) {
      this.ctx.drawImage(image, sx, sy, swidth, sheight);
    } else {
      this.ctx.drawImage(
        image,
        sx,
        sy,
        swidth,
        sheight,
        dx!,
        dy!,
        dwidth!,
        dheight!,
      );
    }
  }

  /** Runs in the context of this canvas */
  public static runInContext(
    callback: (ctx: CanvasRenderingContext2D) => void,
  ) {
    callback(this.ctx);
  }

  /** Rotates the drawing context. */
  public static rotate(angle: number) {
    this.ctx.rotate(angle);
  }

  /** Checks if a position is wwtihing the current camera */
  public static isInCamera(pos: Vec2, margin = 0): boolean {
    const cam = this.getScene()?.getCamera();
    if (!cam) return false;
    const screenPos = cam.worldToScreenVec(pos);
    return (
      screenPos.x >= -margin &&
      screenPos.x < this.screenWidth + margin &&
      screenPos.y >= -margin &&
      screenPos.y < this.screenHeight + margin
    );
  }

  public static deferred<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    task: (this: T) => Generator<any, any, any>,
    thisArg: T,
  ): void;
  public static deferred(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    task: () => Generator<any, any, any>,
  ): void;

  public static deferred<
    TThis,
    TYield = unknown,
    TReturn = unknown,
    TNext = unknown,
  >(
    task: (this: TThis) => Generator<TYield, TReturn, TNext>,
    thisArg: TThis,
  ): void;

  public static deferred<TYield = unknown, TReturn = unknown, TNext = unknown>(
    task: () => Generator<TYield, TReturn, TNext>,
  ): void;

  /**
   * Runs a generator during the time left over in a frame.
   * Very simple scheduling, so some frames might be dropped
   * if the generator isn't consistent!
   */
  public static deferred(
    task: ((this: unknown) => DeferredGenerator) | (() => DeferredGenerator),
    thisArg?: unknown,
  ) {
    const taskFn =
      thisArg === undefined
        ? (task as () => DeferredGenerator)()
        : Reflect.apply(
            task as (this: unknown) => DeferredGenerator,
            thisArg,
            [],
          );

    this.deferredTasks.push({
      taskFn,
      lastExecTime: 1,
    });
  }
}
export const Peek: typeof PeekMain & DrawWritable = PeekMain;

// Expose the engine!
window.Peek = Peek;
