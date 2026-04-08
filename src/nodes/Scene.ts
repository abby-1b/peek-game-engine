import { Peek } from '../peek';
import { System } from '../systems/System';
import { Signal } from '../util/Signal';
import { AnyConstructorFor } from '../util/types';
import { Camera } from './Camera';
import { PNode } from './PNode';

/**
 * Scenes are nodes that can preload their children. They also keep track of
 * their scene ID, which is a unique identifier assigned to each scene.
 *
 * Note: scene IDs are sequential, not assigned randomly.
 */
export class Scene extends PNode {
  private static currSceneID = 0;
  public readonly sceneID: number;

  public nodeAdded = new Signal<[PNode]>();
  public nodeRemoved = new Signal<[PNode]>();

  /** Returns this, as this is the parent scene */
  public override get parentScene(): Scene {
    return this;
  }

  /** Instantiates a scene */
  public constructor() {
    super();
    this.sceneID = ++Scene.currSceneID;
  }

  // --- SYSTEMS ---

  private innerSystemsMap = new Map<AnyConstructorFor<System>, System>();
  private innerSystemsList: System[] = [];

  /** Enables a system, along with all the systems it needs */
  public enableSystem(systemType: AnyConstructorFor<System>): this {
    if (this.innerSystemsMap.has(systemType)) return;
    const system = new systemType(this);
    system.requiredSystems.forEach((s) => this.enableSystem(s));
    this.innerSystemsMap.set(systemType, system);
    this.innerSystemsList.push(system);
    this.innerSortSystems();
    return this;
  }

  /** Enables multiple systems at once */
  public enableMultipleSystems(
    ...newSystems: AnyConstructorFor<System>[]
  ): this {
    newSystems.forEach((s) => this.enableSystem(s));
    return this;
  }

  /** Disables a system, keeping its required systems */
  public disableSystem(systemType: AnyConstructorFor<System>): void {
    const system = this.innerSystemsMap.get(systemType);
    if (!system) {
      return;
    }

    this.innerSystemsMap.delete(systemType);
    const index = this.innerSystemsList.indexOf(system);
    if (index !== -1) {
      this.innerSystemsList.splice(index, 1);
    }
  }

  /** Disables multiple systems at once */
  public disableMultipleSystems(...systems: (new () => System)[]): this {
    systems.forEach((s) => this.disableSystem(s));
    return this;
  }

  /**
   * Processes all the enabled systems,
   * only processing those at or below the given threshold.
   */
  public _processUnderPriority(priorityThreshold: number): void {
    const list = this.innerSystemsList;
    const length = list.length;

    // Standard for-loop and early break provide C-style performance
    for (let i = 0; i < length; i++) {
      const system = list[i];

      if (system.priority >= priorityThreshold) {
        break;
      }

      system.process();
    }
  }

  /** Inner function used to sort systems (for fast processing) */
  private innerSortSystems(): void {
    this.innerSystemsList.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Gets a system instance. Returns undefined if none exists.
   * @param system The type of the system
   * @returns The system instance (or undefined, if none was found)
   */
  public getSystem<T extends System>(
    systemType: AnyConstructorFor<T>,
  ): T | undefined {
    return this.innerSystemsMap.get(systemType) as T;
  }

  // --- CAMERA ---

  /**
   * Holds the currently active camera.
   * @internal
   */
  public _innerCamera: Camera | undefined;

  /**
   * Gets this scene's active camera.
   * If no camera is assigned, this is `undefined`.
   */
  public getCamera(): Camera | undefined {
    return this._innerCamera;
  }

  // --- OVERRIDES ---

  /** Lets peek know what's being processed */
  public override _processCaller(): void {
    Peek._sceneProcessStack.push(this.sceneID);
    super._processCaller();
    Peek._sceneProcessStack.pop();
  }

  /** Lets peek know what's being preloaded */
  public override async _preloadCaller() {
    Peek._sceneProcessStack.push(this.sceneID);
    await super._preloadCaller();
    Peek._sceneProcessStack.pop();
  }
}
