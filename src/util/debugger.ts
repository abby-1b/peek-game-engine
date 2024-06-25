/* eslint-disable @typescript-eslint/no-explicit-any */
import { Input } from '../control/inputs/Input';
import { PNode } from '../nodes/PNode';
import { Peek } from '../peek';
import { Texture } from '../resources/Texture';
import { Vec2 } from '../resources/Vec';

type HookReturn =
  { override: false, value?: any } |
  { override: true , value : any } |
  undefined;

/** Helps with debugging! The main feature of Peek! */
export class Debugger {
  /** Initializes the debugger. */
  public static async init() {
    // Hook into `Vec2`
    this.runBefore(Vec2, 'div', function(x, y) {
      console.log('Dividing:', x, y);
      if (x == 0 || y == 0) Debugger.debugLog('Division by zero!');
    });
    this.runBefore(Vec2, 'divVec', function(v) {
      if (v.x == 0 || v.y == 0) Debugger.debugLog('Division by zero!');
    });
    this.runBefore(Vec2, 'divScalar', function(s) {
      if (s == 0) Debugger.debugLog('Division by zero!');
      return { override: false };
    });

    // Hook into `Texture`
    this.runBefore(Texture, 'setPixel', function(x, y) {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
        Debugger.debugLog('Setting pixel out of bounds!');
      }
    });
    this.runBefore(Texture, 'fadePixel', function(x, y) {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
        Debugger.debugLog('Fading pixel out of bounds!');
      }
    });

    // Hook into `Input`
    this.runBefore(Input, 'onInitialize', function() {
      Debugger.debugLog('Please override `onInitialize` for this input.');
    });
    this.runBefore(Input, 'onDestroy', function() {
      Debugger.debugLog('Please override `onDestroy` for this input.');
    });

    // Hook into `Peek`
    this.runBefore(Peek, 'enableSystems', function() {
      // Ensure systems are loaded before loading a scene!
      if ((this as any).loadedSceneID != -1) {
        Debugger.debugLog('Tried enabling systems after loading scene!');
      }
    }, true);
    const hitboxDrawFn = (child: PNode, nest: number) => {
      // Draw child hitboxes
      for (const c of child.children) {
        hitboxDrawFn(c, nest + 1);
      }

      // Draw this hitbox
      const hb = child.getHitbox();
      Peek.ctx.strokeStyle = 'rgb(255, 0, 0)';
      Peek.ctx.beginPath();
      Peek.ctx.rect(
        ~~hb.x + 0.5,
        ~~hb.y + 0.5,
        hb.w == 0 ? 0.01 : hb.w - 1,
        hb.h == 0 ? 0.01 : hb.h - 1
      );
      Peek.ctx.stroke();
    };
    this.runAfter(Peek, 'frame', function() {
      // Draw the hitboxes!
      const scene = Peek.scenes[(Peek as any).loadedSceneID];
      if (scene !== 0) {
        hitboxDrawFn(scene, 0);
      }
    }, true);
  }

  /** Prints a debug message to the console. */
  private static debugLog(message: string) {
    let trace = new Error().stack?.split('\n').slice(3).join('\n');
    if (trace) { trace = '\n' + trace; }
    console.warn(`DEBUGGER: ${message}${trace}`);
  }

  // Hook (before)

  private static runBefore<T>(
    injectInto: new (...args: any[]) => T,
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
    injectInto: new (...args: any[]) => T,
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
        return realReturn;
      }
    };

    // Inject the function!
    baseFnHolder[methodName] = compoundFunctionHolder[debugMethodName];
  }
}
