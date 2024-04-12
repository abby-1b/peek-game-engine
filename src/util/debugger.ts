/* eslint-disable @typescript-eslint/no-explicit-any */
import { Texture } from '../resources/Texture';
import { Vec2 } from '../resources/Vec';

type HookReturn =
  { override: false, value?: any } |
  { override: true , value : any } |
  undefined;

/** Helps with debugging! The main feature of Peek! */
export class Debugger {
  /** Initializes the debugger. */
  public static init() {
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
  }

  /** Prints a debug message to the console. */
  private static debugLog(message: string) {
    const trace = new Error().stack?.split('\n').slice(3).join('\n');
    console.warn(`DEBUGGER: ${message}` + (trace ? `\n${trace}` : ''));
  }

  /**
   * Makes a hook function run before its overriden function.
   * @param injectInto The class to inject into
   * @param methodName The method to inject into
   * @param hookFunction The code to run before the method runs
   */
  private static runBefore<
    T,
    K extends keyof T & string,
    F extends T[K] & ((...args: any[]) => any)
  >(
    injectInto: new (...args: any[]) => T,
    methodName: K,
    hookFunction: (this: T, ...args: Parameters<F>) => HookReturn | void
  ) {
    if (!(methodName in injectInto.prototype)) {
      console.error(
        `DEBUGGER: Can't override \`${methodName.toString()}\` in ` +
        `\`${injectInto}\`, as it's not a function.`
      );
    }

    // Save the old function
    const oldFn = injectInto.prototype[methodName] as (...args: any[]) => any;

    /**
     * Construct the override function, which runs the hookFunction first, then
     * the normal function. If the hook function returns with `override` set to
     * true, the returned object's `value` is returned instead.
     */
    const compoundFunction = function(this: any, ...args: any[]) {
      const ret = (hookFunction as any).bind(this)(...args);
      if (ret && ret.override) { return ret.value; }
      oldFn.bind(this)(...args);
    };

    // Make the function have the correct name in the stack trace (for logging)
    Object.defineProperty(
      compoundFunction,
      'name',
      { value: methodName, writable: false }
    );

    // Inject the function!
    injectInto.prototype[methodName] = compoundFunction;
  }
}
