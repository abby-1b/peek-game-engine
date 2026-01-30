/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-debugger */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Controller } from '../control/Control';
import { ButtonState, Input } from '../control/inputs/Input';
import { Camera } from '../nodes/Camera';
import { TextBox } from '../nodes/control/TextBox';
import { DynamicBody } from '../nodes/physics/DynamicBody';
import { StaticBody } from '../nodes/physics/StaticBody';
import { PNode } from '../nodes/PNode';
import { Scene } from '../nodes/Scene';
import { Peek } from '../peek';
import { Color } from '../resources/Color';
import { Font } from '../resources/Font';
import { CircleBox, SquareBox } from '../resources/HitBox';
import { Texture } from '../resources/Texture';
import { Vec2 } from '../resources/Vec';
import { BlendMode } from '../util/BlendMode';
import { System } from './System';

const enum ShowHitboxLevel {
  NONE = 0,
  PHYSICS = 1,
  ALL = 2,
}

type HookReturn =
  // Doesn't override, runs the original function
  | { override: false, value?: any } | undefined
  // Overrides the return value, doesn't run the function
  | { override: true , value: any }
  // Overrides the arguments, which are passed to the original function
  | { overrideArgs: any[] };

/** Helps with debugging! The main feature of Peek! */
export class Debugger extends System {
  public static isPaused = false;
  public static remainingRunFrames = 0;
  public static showHitboxes: ShowHitboxLevel = ShowHitboxLevel.PHYSICS;

  public static font = Font.defaultFont;

  // Logging

  public static frameRateDrawPosition = 0;
  public static lastFrameRate = 60;
  public static frameRateTexture = new Texture(128, 32);
  public static frameLineColor = new Color(0, 0, 255, 80);
  public static debugLines: (() => string)[] = [
    () => 'FPS: ' + Math.round(Peek.frameRate),
    () => 'SFR: ' + Math.round(Peek.smoothFrameRate),
    () => 'Focused: ' + Debugger.focusedNodes.size,
    () => Debugger.isPaused ? '[Paused]' : '',
  ];

  // Debugging things

  public static focusedNodes = new Set<PNode>();
  public static debugCamera = new Camera();

  public static showFramerate = true;
  public static showAtlas = false;
  public static controller = new Controller({
    pointer: {
      mouse: true,
      touch: true
    },
    directional: {
      keyboard: {
        wasd: true,
        arrows: true
      },
    },
    buttons: {
      'action': {
        keyboardKeys: [ ' ', 'Enter' ]
      },
      'modify': {
        keyboardKeys: [ 'Shift' ]
      },
      'leave': {
        keyboardKeys: [ 'Escape' ]
      },
      'pauseUnpause': {
        keyboardKeys: [ '\\' ]
      },
      'hitboxes': {
        keyboardKeys: [ '[' ]
      },
      'stepFrame': {
        keyboardKeys: [ ']' ]
      },
      'showAtlas': {
        keyboardKeys: [ '`' ]
      },
    }
  });

  // Debugger nodes

  public static overlay = new Scene().add(
    new TextBox()
      .setSizePixels(32, 32)
      .setColor(Color.WHITE)
      .setText('Nice!')
  );

  // Lag emulation

  /** The simualted ratio of lag frames to normal frames */
  public static lagFrameRatio = 0.0;

  /** The current amount of simulated lag frames */
  public static framesLag = 1;
  public static framesNormal = 1;

  /** Initializes the debugger */
  public constructor() {
    super();

    // Hook into `Vec2`
    Debugger.runBefore(Vec2, 'div', function(x, y) {
      // console.log('Dividing:', x, y);
      if (x === 0 || y === 0) Debugger.debugLog('Division by zero!');
    });
    Debugger.runBefore(Vec2, 'divVec', function(v) {
      if (v.x === 0 || v.y === 0) Debugger.debugLog('Division by zero!');
    });
    Debugger.runBefore(Vec2, 'divScalar', function(s) {
      if (s === 0) Debugger.debugLog('Division by zero!');
      return { override: false };
    });

    // Hook into `Texture`
    Debugger.runBefore(Texture, 'setPixel', function(x, y) {
      if (x < 0 || x >= this.getWidth() || y < 0 || y >= this.getHeight()) {
        Debugger.debugLog('Setting pixel out of bounds!');
      }
    });
    Debugger.runBefore(Texture, 'setPixelRaw', function(x, y) {
      if (x < 0 || x >= this.getWidth() || y < 0 || y >= this.getHeight()) {
        Debugger.debugLog('Setting pixel out of bounds!');
      }
    });
    Debugger.runBefore(Texture, 'getPixel', function(x, y) {
      if (x < 0 || x >= this.getWidth() || y < 0 || y >= this.getHeight()) {
        Debugger.debugLog('Getting pixel out of bounds!');
      }
    });
    Debugger.runBefore(Texture, 'getPixelRaw', function(x, y) {
      if (x < 0 || x >= this.getWidth() || y < 0 || y >= this.getHeight()) {
        Debugger.debugLog('Getting pixel out of bounds!');
      }
    });
    Debugger.runBefore(Texture, 'fadePixel', function(x, y) {
      if (x < 0 || x >= this.getWidth() || y < 0 || y >= this.getHeight()) {
        Debugger.debugLog('Fading pixel out of bounds!');
      }
    });

    // Hook into `Input`
    Debugger.runBefore(Input, 'onInitialize', function() {
      Debugger.debugLog('Please override `onInitialize` for this input.');
    });
    Debugger.runBefore(Input, 'onDestroy', function() {
      Debugger.debugLog('Please override `onDestroy` for this input.');
    });

    // Hook into `Font`
    Debugger.runBefore(Font, 'fontLoaded', function(success) {
      if (!success) {
        Debugger.debugLog('Font not loaded!');
      }
    });
    Debugger.runBefore(Font, 'draw', function() {
      if (!(this as any).isLoaded) {
        Debugger.debugLog('Font couldn\'t load!');
        return { override: true, value: undefined };
      }
    });

    // Hook into `Controller`
    Debugger.runBefore(Controller, 'triggerButton', function(name, state) {
      if (
        this === Debugger.controller ||
        state === ButtonState.UNPRESSED ||
        !Debugger.isPaused
      ) { return; }

      // Stop buttons from triggering when paused
      return {
        override: true,
        value: void 0
      };
    });

    // Replace the default camera with the debug camera
    let dragLength = 0;
    Debugger.runAfter(Scene, 'getCamera', function() {
      if (this !== Peek.getScene()) {
        // Only override the main scene's camera
        return;
      }

      const drag = Debugger.controller.drag();

      if (!Debugger.isPaused) {
        // Only override when paused
        return;
      }

      // Allow drag
      if (drag.length() > 1) {
        dragLength += drag.length();
        Debugger.unfocus();
      }
      Debugger.debugCamera.pos.subVec(drag);

      if (Debugger.focusedNodes.size > 0) {
        // Move the debug camera towards the average target position
        const avgPosition = Vec2.zero();
        for (const node of Debugger.focusedNodes) {
          const hb = node.getHitbox(true);
          avgPosition.addVec(hb.center());
        }
        avgPosition.divScalar(Debugger.focusedNodes.size);
        Debugger.debugCamera.pos.lerpVec(avgPosition, 0.1);
      }

      Debugger.debugCamera.cameraProcess(Peek.delta);
      return { override: true, value: Debugger.debugCamera };
    });

    // `Peek` hooks
    Debugger.runBefore(Peek, 'enableSystems', function() {
      // Ensure systems are loaded before loading a scene!
      if (Peek.getScene() !== undefined) {
        Debugger.debugLog('Tried enabling systems after loading scene!');
      }
    }, true);

    Debugger.runBefore(Peek, 'frameCallback', function() {
      if (Debugger.framesLag / Debugger.framesNormal < Debugger.lagFrameRatio) {
        Debugger.framesLag++;

        // Because the rest of the function is overrided,
        // the next frame needs to be queued manually.
        window.requestAnimationFrame((Peek as any).frameCallback);

        return { override: true, value: undefined };
      } else {
        Debugger.framesNormal++;
      }
      if (Debugger.framesLag + Debugger.framesNormal > 5) {
        // Keep the ratio parts low
        Debugger.framesLag /= 2;
        Debugger.framesNormal /= 2;
      }
    }, true);

    // Debugger pause hook
    Debugger.runBefore(Peek, 'frame', function(
      delta, _shouldProcessNodes, processSystemPriorityLessThan
    ) {
      if (Debugger.remainingRunFrames) {
        // Continue running for a specified amount of frames
        Debugger.remainingRunFrames--;
        return;
      }
      return {
        overrideArgs: [
          delta, !Debugger.isPaused,
          Debugger.isPaused ? 0 : processSystemPriorityLessThan
        ]
      };
    }, true);

    // Hitbox drawing 
    const hitboxDrawFn = (child: PNode, nest: number) => {
      // Draw child hitboxes
      for (const c of child.getChildren()) {
        hitboxDrawFn(c, nest + 1);
      }

      if (
        Debugger.showHitboxes === ShowHitboxLevel.PHYSICS &&
        !(child instanceof StaticBody)
      ) return;

      // Draw this hitbox
      const hb = child.getHitbox(true);
      let zeroSize = false;
      if (hb instanceof SquareBox) {
        // Square hitbox
        if (hb.w < 0.5 && hb.h < 0.5) {
          zeroSize = true;
        } else {
          Peek.rect(
            hb.x,
            hb.y,
            hb.w < 0.5 ? 1 : hb.w,
            hb.h < 0.5 ? 1 : hb.h,
            Color.RED
          );
        }
      } else if (hb instanceof CircleBox) {
        // Circle hitbox
        if (hb.r < 0.5) {
          zeroSize = true;
        } else {
          // Peek.circle(hb.x, hb.y, hb.r, Color.RED);
          Peek.runInContext((ctx) => {
            ctx.strokeStyle = Color.RED.fillStyle();
            ctx.beginPath();
            ctx.arc(hb.x, hb.y, hb.r, 0, 2 * Math.PI);
            ctx.stroke();
          });
        }
      }

      if (zeroSize) {
        // Draw a small crosshair
        Peek.line(hb.x + 2, hb.y, hb.x + 4, hb.y, Color.RED);
        Peek.line(hb.x - 2, hb.y, hb.x - 4, hb.y, Color.RED);
        Peek.line(hb.x, hb.y + 2, hb.x, hb.y + 4, Color.RED);
        Peek.line(hb.x, hb.y - 2, hb.x, hb.y - 4, Color.RED);
      }

      if (child instanceof DynamicBody) {
        const center = hb.center();
        Peek.line(
          center.x,
          center.y,
          center.x + child.velocity.x * 16,
          center.y + child.velocity.y * 16,
          Color.BLUE
        );
      }
    };
    Debugger.runAfter(Peek, 'frame', function() {
      // Debugger.controller.onPress('')
      // Transform into screen-space (due to black bars)
      const transform = (this as any).ctx.getTransform();
      (this as any).ctx.translate(
        (Peek as any).finalDrawX,
        (Peek as any).finalDrawY
      );

      // Draw the hitboxes!
      const scene = Peek.getScene();
      if (scene && Debugger.showHitboxes) {
        hitboxDrawFn(scene, 0);
      }

      (this as any).ctx.setTransform(transform);

      // Draw the debug scene
      // this.ctx.translate(32, 32);
      // Peek.ctx.fillStyle = '#0f0';
      // Peek.ctx.fillRect(0, 0, 32, 32);
      // Debugger.overlay.drawCaller();
      // this.ctx.translate(-32, -32);

      // // TODO: re-implement everything below this
      // return;

      // Draw the framerate diagram
      if (Debugger.showFramerate) {
        const frameRatePos =
          Debugger.frameRateToTextureY(Peek.frameRate);
        const frameRatePosSmooth =
          Debugger.frameRateToTextureY(Peek.smoothFrameRate);

        Debugger.frameRateTexture.setPixel(
          Debugger.frameRateDrawPosition,
          ~~((Debugger.frameRateTexture.getHeight() - 1) / 2),
          Debugger.frameLineColor
        );
        const minFR = Math.min(frameRatePos, Debugger.lastFrameRate);
        Debugger.frameRateTexture.fillRect(
          Debugger.frameRateDrawPosition, ~~minFR,
          1, 1 + ~~(Math.max(frameRatePos, Debugger.lastFrameRate) - minFR),
          Color.RED
        );
        Debugger.frameRateTexture.setPixel(
          Debugger.frameRateDrawPosition, 
          frameRatePosSmooth,
          Color.GREEN
        );
        Debugger.lastFrameRate = frameRatePos;
        Debugger.frameRateDrawPosition++;
        if (
          Debugger.frameRateDrawPosition >= Debugger.frameRateTexture.getWidth()
        ) {
          Debugger.frameRateDrawPosition = 0;
        }
        Debugger.frameRateTexture.clearRect(
          Debugger.frameRateDrawPosition, 0,
          1, Debugger.frameRateTexture.getHeight()
        );
        Debugger.frameRateTexture.draw(1, 1);

        // Draw the extra information
        let finalString = '';
        for (const fn of Debugger.debugLines) {
          finalString += fn() + '\n';
        }
        (this as any).ctx.globalCompositeOperation = BlendMode.SUBTRACT;
        Debugger.font.draw(
          finalString, 1,
          Debugger.frameRateTexture.getHeight() + 2
        );
        (this as any).ctx.globalCompositeOperation = BlendMode.NORMAL;
      }

      // Draw the texture atlas
      if (Debugger.showAtlas) {
        const atlasScale = 1;
        const TextureAtlas = window.TextureAtlas;
        this.drawImage(
          TextureAtlas.atlasCanvas,
          
          0, 0,
          TextureAtlas.atlasCanvas.width,
          TextureAtlas.atlasCanvas.height,

          0, 0,
          TextureAtlas.atlasCanvas.width * atlasScale,
          TextureAtlas.atlasCanvas.height * atlasScale,
        );
  
        for (const atlasRect of TextureAtlas.usedRects) {
          this.rect(
            ~~(atlasRect.x * atlasScale), ~~(atlasRect.y * atlasScale),
            ~~(atlasRect.w * atlasScale), ~~(atlasRect.h * atlasScale),
            Color.RED
          );
        }
  
        for (const atlasRect of TextureAtlas.freeRects) {
          this.rect(
            ~~(atlasRect.x * atlasScale), ~~(atlasRect.y * atlasScale),
            ~~(atlasRect.w * atlasScale), ~~(atlasRect.h * atlasScale),
            Color.GREEN
          );
        }
      }
    }, true);

    Debugger.controller.onPress('leave', () => {
      if (Debugger.focusedNodes.size > 0) {
        // Unfocus nodes!
        Debugger.focusedNodes.clear();
      } else if (Debugger.isPaused) {
        // Un-pause
        Debugger.togglePause();
      }
    });
    Debugger.controller.onPress('pauseUnpause', () => {
      // Toggle pause
      Debugger.togglePause();
    });
    Debugger.controller.onPress('hitboxes', () => {
      // Toggle hitboxes
      let level: ShowHitboxLevel;
      switch (Debugger.showHitboxes) {
      case ShowHitboxLevel.NONE: level = ShowHitboxLevel.PHYSICS; break;
      case ShowHitboxLevel.PHYSICS: level = ShowHitboxLevel.ALL; break;
      case ShowHitboxLevel.ALL: level = ShowHitboxLevel.NONE; break;
      }
      Debugger.showHitboxes = level;
    });
    Debugger.controller.onPress('stepFrame', () => {
      if (Debugger.isPaused) {
        // Step a single frame
        Debugger.remainingRunFrames++;
      }
    });
    Debugger.controller.onPress('showAtlas', () => {
      Debugger.showAtlas = !Debugger.showAtlas;
    });

    // Hitbox selection
    Debugger.controller.onPress('pointer', () => {
      dragLength = 0;
    });
    Debugger.controller.onRelease('pointer', () => {
      // Only select when paused!
      if (!Debugger.isPaused || dragLength > 1) { return; }

      const scene = Peek.getScene();
      const worldPos = scene
        ?.getCamera()
        ?.screenToWorld(Debugger.controller.pointer);
      
      if (!worldPos) { return; }

      const node = scene!.getNodeAt(worldPos);
      if (node) {
        Debugger.focus(node, Debugger.controller.buttons.modify);
      } else {
        Debugger.unfocus();
      }
    });
  }

  /**
   * Converts a framerate into a Y position inside the framerate texture.
   * @param frameRate The given framerate
   */
  private static frameRateToTextureY(frameRate: number) {
    let frameRatePos =
      (120 - frameRate) *
      Debugger.frameRateTexture.getHeight() / 120;
    if (frameRatePos < 0) {
      frameRatePos = 0;
    } else if (frameRatePos >= Debugger.frameRateTexture.getHeight()) {
      frameRatePos = Debugger.frameRateTexture.getHeight() - 1;
    }
    return frameRatePos;
  }

  /** Toggles the pause state */
  public static togglePause() {
    if (Debugger.focusedNodes.size === 0) {
      // There are no focused nodes, move debug camera to scene camera
      const cameraCenter = Peek.getScene()
        ?.getCamera()
        ?.getCameraPos();
      if (cameraCenter) {
        Debugger.debugCamera.pos.setVec(cameraCenter);
      }
    }

    Debugger.isPaused = !Debugger.isPaused;
  }

  /**
   * Focuses on a PNode object. This pans the camera to it
   * @param node The node that will be focused
   * @param keepOtherNodes Whether to push or replace other focused nodes
   */
  public static focus(node: PNode, keepOtherNodes = false) {
    if (node === undefined) {
      Debugger.debugLog('Tried adding an undefined node!');
      debugger;
    }

    if (keepOtherNodes) {
      this.focusedNodes.add(node);
    } else {
      this.focusedNodes.clear();
      this.focusedNodes.add(node);
    }
  }

  /** Un-focuses all focused nodes */
  public static unfocus() {
    this.focusedNodes.clear();
  }

  /**
   * Watches a property of an object.
   * @param obj The object (single instance!) to watch
   * @param property The property
   * @param callback Gets called when the property is set
   */
  public static watchProperty<T, K extends keyof T>(
    obj: T,
    property: K,
    callback = (oldVal: T[K], newVal: T[K]) => {
      console.log('Changed', obj, property, 'from', oldVal, 'to', newVal);
      debugger;
    }
  ) {
    let realValue = obj[property];
    Object.defineProperty(obj, property, {
      get: () => realValue,
      set: (newValue) => {
        callback(realValue, newValue);
        realValue = newValue;
      }
    });
  }

  /** Process loop for Debugger */
  public override process(): void {}

  /** Prints a debug message to the console. */
  private static debugLog(...parts: unknown[]) {
    let trace = new Error().stack?.split('\n').slice(3).join('\n');
    if (trace) { trace = '\n' + trace; }
    console.warn('DEBUGGER:', ...parts, trace);
  }

  // Hook (before)

  private static runBefore<T>(
    injectInto: Function & { prototype: T },
    methodName: string,
    hookFunction: (this: T, ...args: any[]) => HookReturn | void,
  ): void;
  private static runBefore<T>(
    injectInto: T,
    methodName: string,
    hookFunction: (this: T, ...args: any[]) => HookReturn | void,
    isStatic: true
  ): void;

  /**
   * Makes a hook function run before its overriden function.
   * @param injectInto The class to inject into
   * @param methodName The method to inject into
   * @param hookFunction The code to run before the method runs
   */
  private static runBefore<T>(
    injectInto: any,
    methodName: string,
    hookFunction: (this: T, ...args: any) => HookReturn | void,
    isStatic: boolean = false
  ) {
    const baseFnHolder = isStatic ? injectInto : injectInto.prototype;
    if (!(methodName in baseFnHolder)) {
      console.error(
        `DEBUGGER: Can't override \`${methodName.toString()}\` in`,
        baseFnHolder,
        'as it\'s not a function.'
      );
      return;
    }

    // Save the old function
    const oldFn = baseFnHolder[methodName] as (...args: any[]) => any;

    const debugMethodName = methodName + '_withDebuggerHook';
    const debugFunctionHolder = {
      /**
       * Construct the override function, which runs the hookFunction first,
       * then the normal function. If the hook function returns with `override`
       * set to true, the returned object's `value` is returned instead.
       */
      [debugMethodName]: function(this: any, ...args: any[]) {
        const ret = (hookFunction as any).bind(this)(...args);
        if (ret && ret.override) { return ret.value; }
        if (ret && ret.overrideArgs) {
          return oldFn.bind(this)(...ret.overrideArgs);
        }
        return oldFn.bind(this)(...args);
      }
    };

    // Inject the function!
    baseFnHolder[methodName] = debugFunctionHolder[debugMethodName];
  }

  // Hook (after)

  /**
   * Makes a hook function run after its overriden function.
   * @param injectInto The class to inject into
   * @param methodName The method to inject into
   * @param hookFunction The code to run before the method runs
   */
  private static runAfter<
    T,
    K extends keyof T & string,
    F extends T[K] & ((...args: any[]) => any)
  >(
    injectInto: Function & { prototype: T },
    methodName: K | string,
    hookFunction: (this: T, ...args: Parameters<F>) => HookReturn | void,
  ): void;
  /**
   * Makes a hook function run after its overriden function.
   * @param injectInto The class to inject into
   * @param methodName The method to inject into
   * @param hookFunction The code to run before the method runs
   */
  private static runAfter<
    T,
    K extends keyof T & string,
    F extends T[K] & ((...args: any[]) => any)
  >(
    injectInto: T,
    methodName: K | string,
    hookFunction: (this: T, ...args: Parameters<F>) => HookReturn | void,
    isStatic: true
  ): void;

  /**
   * Makes a hook function run after its overriden function.
   * @param injectInto The class to inject into
   * @param methodName The method to inject into
   * @param hookFunction The code to run before the method runs
   */
  private static runAfter<T>(
    injectInto: any,
    methodName: string,
    hookFunction: (this: T, ...args: any) => HookReturn | void,
    isStatic: boolean = false
  ) {
    const baseFnHolder = isStatic ? injectInto : injectInto.prototype;
    if (!(methodName in baseFnHolder)) {
      console.error(
        `DEBUGGER: Can't override \`${methodName.toString()}\` in`,
        baseFnHolder,
        'as it\'s not a function.'
      );
      return;
    }

    // Save the old function
    const oldFn = baseFnHolder[methodName] as (...args: any[]) => any;

    const debugMethodName = methodName + '_withDebuggerHook';
    const debugFunctionHolder = {
      /**
       * Construct the override function, which runs the hookFunction first,
       * then the normal function. If the hook function returns with `override`
       * set to true, the returned object's `value` is returned instead.
       */
      [debugMethodName]: function(this: any, ...args: any[]) {
        const realReturn = oldFn.bind(this)(...args);
        const ret = (hookFunction as any).bind(this)(...args);
        if (ret && ret.override) { return ret.value; }
        if (ret !== undefined) { return oldFn.bind(this)(...ret.overrideArgs); }
        return realReturn;
      }
    };

    // Inject the function!
    baseFnHolder[methodName] = debugFunctionHolder[debugMethodName];
  }
}

window.Debugger = Debugger;
