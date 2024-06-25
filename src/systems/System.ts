
/**
 * A system is something that runs at least every frame (though it can be more
 * often), and can be used across multiple projects. They're similar to the ECS
 * version of systems.
 */
export abstract class System {
  /** A list of systems that this system requires. */
  public requiredSystems: (typeof System)[] = [];

  /** Higher-priority systems are ran first */
  public readonly priority: number = -1;

  /** This function is the entrypoint to the system */
  public abstract process(delta: number): void;
}
