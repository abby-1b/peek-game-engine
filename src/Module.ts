/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Modules are an integral part of the engine. They allow features to be turned
 * on and off in real time, and allows for a lot more modularity!
 */
export abstract class Module {
  private static isProperlyInitialized = false;
  /**
   * Gets called when the module is first initiated.
   */
  public static init(...args: any[]) {
    args; // Args
    this.isProperlyInitialized = true;
  }

  /**
   * @returns Whether or not this module was properly initialized. This is only
   * true if the base Module class' `init` method was called, so neglecting to
   * call `super.init()` in children of the base class will result in this being
   * false.
   */
  public static wasProperlyInitialized() {
    return this.isProperlyInitialized;
  }
}
