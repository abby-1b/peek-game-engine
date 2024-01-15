/* eslint-disable @typescript-eslint/no-explicit-any */
import { Module } from './Module.ts';
import { error, warn } from './errors.ts';

/**
 * This ensures sure that the class is chainable. All of its public methods must
 * return `this`, while its private methods are left unrestrained.
 */
type ChainClass<T> =  T extends {
  (...args: unknown[]): unknown;
  private?: boolean;
} ? T : Record<keyof T, (...args: any) => T>;

/**
 * The main Engine class, which gives the user control over all of the
 * engine's features.
 */
class EngineInstance implements ChainClass<EngineInstance> {
  private modules = new Set<typeof Module>();

  /** Adds a module to this instance */
  public module<A extends any[], M extends Module>(
    m: typeof Module & { init: (...args: A) => void },
    ...args: A
  ): this {
    console.log('Adding module:', m.name); // Log
    
    if (this.modules.has(m)) {
      warn(`Module \`${m.name}\` has already been initialized!`);
    }

    m.init(...args); // Initiate the module
    if (!m.wasProperlyInitialized()) {
      error(`Module \`${m.name}\` not properly initialized! Remember to call \`super.init()\`!`);
      return this;
    }

    this.modules.add(m); // Add the module to the list
    (window as any)[m.name] = m;
    return this;
  }
}

export const Engine = new EngineInstance();

// Expose the engine!
(window as unknown as any).Engine = Engine;
