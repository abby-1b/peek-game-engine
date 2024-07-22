/* eslint-disable no-debugger */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Input } from '../control/inputs/Input';
import { DynamicBody } from '../nodes/physics/DynamicBody';
import { PNode } from '../nodes/PNode';
import { Peek } from '../peek';
import { Color } from '../resources/Color';
import { Font } from '../resources/Font';
import { Texture } from '../resources/Texture';
import { Vec2 } from '../resources/Vec';
import { Path } from '../util/Path';
import { System } from './System';

type HookReturn =
  // Doesn't override, runs the original function
  | { override: false, value?: any } | undefined
  // Overrides the return value, doesn't run the function
  | { override: true , value : any }
  // Overrides the arguments, which are passed to the original function
  | { overrideArgs: any[] };

/** Helps with debugging! The main feature of Peek! */
export class Debugger extends System {
  public static isPaused = false;
  public static remainingRunFrames = 0;
  public static showHitboxes = true;

  public static font = new Font(
    Path.relativeToModule(
      import.meta.url,
      '../resources/font-medium.png'
    ),
    6, 8, false
  );

  public static frameRateDrawPosition = 0;
  public static lastFrameRate = 60;
  public static frameRateTexture = new Texture(128, 32);

  /** Initializes the debugger. */
  public constructor(debugKey: string = '\\') {
    super();

    // Hook into `Vec2`
    Debugger.runBefore(Vec2, 'div', function(x, y) {
      console.log('Dividing:', x, y);
      if (x == 0 || y == 0) Debugger.debugLog('Division by zero!');
    });
    Debugger.runBefore(Vec2, 'divVec', function(v) {
      if (v.x == 0 || v.y == 0) Debugger.debugLog('Division by zero!');
    });
    Debugger.runBefore(Vec2, 'divScalar', function(s) {
      if (s == 0) Debugger.debugLog('Division by zero!');
      return { override: false };
    });

    // Hook into `Texture`
    Debugger.runBefore(Texture, 'setPixel', function(x, y) {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
        Debugger.debugLog('Setting pixel out of bounds!');
      }
    });
    Debugger.runBefore(Texture, 'setPixelRaw', function(x, y) {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
        Debugger.debugLog('Setting pixel out of bounds!');
      }
    });
    Debugger.runBefore(Texture, 'getPixel', function(x, y) {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
        Debugger.debugLog('Getting pixel out of bounds!');
      }
    });
    Debugger.runBefore(Texture, 'getPixelRaw', function(x, y) {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
        Debugger.debugLog('Getting pixel out of bounds!');
      }
    });
    Debugger.runBefore(Texture, 'fadePixel', function(x, y) {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
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
      if (!(this as any).fontImage) {
        Debugger.debugLog('Font couldn\'t load!');
        return { override: true, value: undefined };
      }
    });

    // `Peek` hooks
    Debugger.runBefore(Peek, 'enableSystems', function() {
      // Ensure systems are loaded before loading a scene!
      if ((this as any).loadedSceneID != -1) {
        Debugger.debugLog('Tried enabling systems after loading scene!');
      }
    }, true);

    // Debugger pause hook
    document.addEventListener('keydown', e => {
      if (e.key == '[') {
        Debugger.showHitboxes = !Debugger.showHitboxes;
      } else if (e.key == debugKey) {
        // Toggles pause
        Debugger.isPaused = !Debugger.isPaused;
      } else if (Debugger.isPaused) {
        // Debugger paused, use keybinds
        if (e.key == ']') {
          Debugger.remainingRunFrames++;
        }
      }
    });
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
      for (const c of child.children) {
        hitboxDrawFn(c, nest + 1);
      }

      // Draw this hitbox
      const hb = child.getHitbox(true);
      Peek.ctx.strokeStyle = 'rgb(255, 0, 0)';
      if (hb.w == 0 && hb.h == 0) {
        Peek.line(hb.x + 2, hb.y, hb.x + 4, hb.y);
        Peek.line(hb.x - 2, hb.y, hb.x - 4, hb.y);
        Peek.line(hb.x, hb.y + 2, hb.x, hb.y + 4);
        Peek.line(hb.x, hb.y - 2, hb.x, hb.y - 4);
      } else {
        Peek.rect(
          hb.x,
          hb.y,
          hb.w == 0 ? 1 : hb.w,
          hb.h == 0 ? 1 : hb.h
        );
      }

      if (child instanceof DynamicBody) {
        const dynamicBody = child as DynamicBody;
        Peek.ctx.strokeStyle = 'rgb(0, 0, 255)';
        Peek.line(
          hb.x + hb.w / 2,
          hb.y + hb.h / 2,
          hb.x + hb.w / 2 + dynamicBody.velocity.x * 16,
          hb.y + hb.h / 2 + dynamicBody.velocity.y * 16
        );
      }
    };
    Debugger.runAfter(Peek, 'frame', function() {
      // Transform into screen-space (due to black bars)
      const transform = this.ctx.getTransform();
      this.ctx.translate(
        (Peek as any).finalDrawX,
        (Peek as any).finalDrawY
      );

      // Draw the hitboxes!
      const scene = Peek.scenes[(Peek as any).loadedSceneID];
      if (scene !== 0 && Debugger.showHitboxes) {
        hitboxDrawFn(scene, 0);
      }

      this.ctx.setTransform(transform);

      // Draw the extra information
      Debugger.font.draw(
        'FPS: ' + Math.round(Peek.frameRate),
        1, 1
      );

      let frameRatePos =
        (120 - Peek.frameRate) *
        Debugger.frameRateTexture.height / 120;
      if (frameRatePos < 0) {
        frameRatePos = 0;
      } else if (frameRatePos >= Debugger.frameRateTexture.height) {
        frameRatePos = Debugger.frameRateTexture.height - 1;
      }
      Debugger.frameRateTexture.setPixel(
        Debugger.frameRateDrawPosition,
        frameRatePos,
        Color.RED
      );
      Debugger.lastFrameRate = frameRatePos;
      Debugger.frameRateDrawPosition++;
      if (Debugger.frameRateDrawPosition >= Debugger.frameRateTexture.width) {
        Debugger.frameRateDrawPosition = 0;
      }
      Debugger.frameRateTexture.clearRect(
        Debugger.frameRateDrawPosition, 0,
        1, Debugger.frameRateTexture.height
      );
      Debugger.frameRateTexture.draw(1, 10);
    }, true);
  }

  /**  */
  public override process(): void {
      
  }

  /** Prints a debug message to the console. */
  private static debugLog(...parts: unknown[]) {
    let trace = new Error().stack?.split('\n').slice(3).join('\n');
    if (trace) { trace = '\n' + trace; }
    console.warn('DEBUGGER:', ...parts, trace);
  }

  // Hook (before)

  private static runBefore<T>(
    injectInto: abstract new (...args: any[]) => T,
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
    const compoundFunctionHolder = {
      /**
       * Construct the override function, which runs the hookFunction first,
       * then the normal function. If the hook function returns with `override`
       * set to true, the returned object's `value` is returned instead.
       */
      [debugMethodName]: function(this: any, ...args: any[]) {
        const ret = (hookFunction as any).bind(this)(...args);
        if (ret && ret.override) { return ret.value; }
        if (ret !== undefined) { return oldFn.bind(this)(...ret.overrideArgs); }
        return oldFn.bind(this)(...args);
      }
    };

    // Inject the function!
    baseFnHolder[methodName] = compoundFunctionHolder[debugMethodName];
  }

  // Hook (after)

  private static runAfter<
    T,
    K extends keyof T & string,
    F extends T[K] & ((...args: any[]) => any)
  >(
    injectInto: abstract new (...args: any[]) => T,
    methodName: K | string,
    hookFunction: (this: T, ...args: Parameters<F>) => HookReturn | void,
  ): void;
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
    const compoundFunctionHolder = {
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
    baseFnHolder[methodName] = compoundFunctionHolder[debugMethodName];
  }
}

window.Debugger = Debugger;
