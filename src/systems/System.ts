import { AnyConstructorFor } from '../util/types';

/**
 * A system is something that runs at least every frame (though it can be more
 * often), and can be used across multiple projects. They're similar to the ECS
 * version of systems.
 * 
 * When creating a system, ensure that its constructor has default parameters!
 * Although arguments can be passed using `Peek.enableSystem(system, ...args)`,
 * enabling 
 */
export abstract class System {
  /** A list of systems that this system requires. */
  public requiredSystems: AnyConstructorFor<System>[] = [];

  /**
   * Establishes the level of priority this system has. Higher-priority systems
   * are ran first. Keep in mind that systems are sorted as they're activated,
   * so changing the priority after initialization is a bad idea.
   * 
   * The debugger uses priority -1. When in debug mode, any systems with a
   * priority less than 0 remain active.
   */
  public readonly priority: number = 0;

  /** This function is the entrypoint to the system */
  public abstract process(delta: number): void;
}
