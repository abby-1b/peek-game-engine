import { Scene } from '../nodes/Scene';
import { AnyConstructorFor } from '../util/types';

/**
 * A system is something that runs at least every frame (though it can be more
 * often), and can be used across multiple projects. They're similar to the ECS
 * version of systems.
 *
 * When creating a custom system, make sure its constructor doesn't take any
 * parameters! Systems are created by type for ease of use, so any config
 * parameters should be passed *after* construction.
 */
export abstract class System {
  /** Creates an instance of a system */
  public constructor(public parent: Scene) {}

  /** A list of systems that this system requires. */
  public requiredSystems: AnyConstructorFor<System>[] = [];

  /**
   * Establishes the level of priority this system has. Higher-priority systems
   * are ran first. Keep in mind that systems are sorted as they're activated,
   * so changing the priority after initialization is a bad idea.
   *
   * The debugger uses priority -1. When in debug mode, any systems with a
   * priority less than 0 remains active.
   */
  public readonly priority: number = 0;

  /**
   * Order this was added to its parent scene (for proper processing)
   * @internal
   */
  public _sequenceOrder = 0;

  /** This function is the entrypoint to the system */
  public abstract process(): void;
}
