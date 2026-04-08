import { Peek } from '../peek';
import { Vec2 } from '../resources/Vec';
import { HitBox, pointIsInHitbox, SquareBox } from '../resources/HitBox';
import { Scene } from './Scene';

export enum PNodeState {
  /** The node hasn't been initialized yet */
  IDLE = 'IDLE',
  /**
   * The node is actively being initialized,
   * or is waiting for its children to initialize
   */
  PRELOADING = 'PRELOADING',
  /** The node is loaded, but isn't being actively used */
  READY = 'READY',
  /** The node is being actively used by Peek */
  ACTIVE = 'ACTIVE',

  /**
   * This node is no longer being used.
   * If it keeps existing for too long,
   * there's probably something wrong.
   */
  DESTROYED = 'DESTROYED',
}

/** Something that can be displayed on the screen */
export class PNode {
  // --- PROPERTIES ---

  /** This node's position */
  public pos: Vec2 = Vec2.zero();

  /** Sets this node's position */
  public setPos(x: number, y: number): this {
    this.pos.set(x, y);
    return this;
  }

  /** Sets this node's position */
  public setPosVec(v: Vec2): this {
    this.pos.setVec(v);
    return this;
  }

  /** Initializes a Node */
  public constructor() {}

  // --- NODE HIRERARCHY (PARENT-CHILD DYNAMICS) ---

  /** This node's parent */
  private innerParent?: PNode;

  /** This node's parent node, which is usually only unset for `Scene` */
  public get parent(): PNode | undefined {
    return this.innerParent;
  }

  /** Gets this node's parent scene */
  public get parentScene(): Scene | undefined {
    return this.parent?.parentScene;
  }

  /** This node's children */
  protected children: PNode[] = [];

  /** Gets this node's children */
  public getChildren(): ReadonlyArray<PNode> {
    return this.children;
  }

  /** Adds children to this node */
  public add(...children: PNode[]): this {
    for (const child of children) {
      // Set the child's parent to be `this`
      // This is the only place that changes a child's parent
      child.reparentCaller(child.innerParent, this);

      if (this.innerState === PNodeState.READY) child._preloadCaller();
      if (this.innerState === PNodeState.ACTIVE)
        child._preloadCaller().then(() => child._enterCaller());

      // Add the child to our set of children
      this.children.push(child);
    }

    // Return this
    return this;
  }

  /** Removes some children from this node */
  public remove(...children: PNode[]): this {
    const childCount = children.length;

    if (childCount === 0) return this;

    if (childCount === 1) {
      // Single child removal
      const index = this.children.indexOf(children[0]);
      children[0].reparentCaller(this, undefined);
      if (index !== -1) {
        this.children.splice(index, 1);
      }
    } else {
      // Multiple child removal
      const targets = new Set(children);
      this.children = this.children.filter((child) => {
        if (targets.has(child)) return true;
        child.reparentCaller(this, undefined);
        return false;
      });
    }

    return this;
  }

  /** Removes children from this node given their indices */
  public removeIndex(...indices: number[]): this {
    return this.remove(...this.children.filter((_, i) => indices.includes(i)));
  }

  /** Removes this node from its parent. */
  public removeSelf() {
    this.innerParent?.remove(this);
  }

  /**
   * Removes all children.
   *
   * Faster than using `this.remove(...this.children)`!
   */
  public clearChildren() {
    this.children = [];
    for (const child of this.children) {
      child.reparentCaller(this, undefined);
      child.innerParent = undefined;
    }
  }

  /**
   * Ran when this node is moved. Moving includes being added to another node's
   * children, being removed from a parent, or anything that changes this
   * node's '.parent' property.
   */
  protected onReparent(
    oldParent: PNode | undefined,
    newParent: PNode | undefined,
  ) {
    oldParent;
    newParent;
  }

  /** @internal */
  private reparentCaller(
    oldParent: PNode | undefined,
    newParent: PNode | undefined,
  ) {
    if (oldParent) oldParent.parentScene?.nodeRemoved.activate(this);
    if (newParent) newParent.parentScene?.nodeAdded.activate(this);
    this.onReparent(oldParent, newParent);
    this.innerParent = newParent;
  }

  // --- LOAD STATE ---

  private innerState: PNodeState = PNodeState.IDLE;

  /** Gets this node's {@link PNodeState} */
  public get state() {
    return this.innerState;
  }
  /** Checks if this node is in the {@link PNodeState.ACTIVE} state. */
  public get isActive() {
    return this.innerState === PNodeState.ACTIVE;
  }

  private preloadPromise: Promise<void> | undefined;

  /**
   * Called at some point before the node is displayed. You should load assets,
   * add nodes, and do everything involved with *loading* in this method.
   *
   * Adding nodes before this callback is highly discouraged,
   * as they won't have a proper parent node before this point.
   *
   * Calls the parent's {@link PNode#preload} before the child's.
   */
  protected async preload() {}

  /** @internal */
  public async _preloadCaller(): Promise<void> {
    if (this.preloadPromise) return this.preloadPromise;

    this.innerState = PNodeState.PRELOADING;
    this.preloadPromise = (async () => {
      await this.preload();
      await Promise.all(this.children.map((child) => child._preloadCaller()));
      this._readyCaller();
      // TODO: what to do with preloadPromise after this? for memory!
    })();

    return this.preloadPromise;
  }

  /**
   * Runs once when this node finishes preloading.
   *
   * Calls the child's {@link PNode#onReady} before the parent's.
   */
  protected onReady() {}

  /** @internal */
  public _readyCaller() {
    // Call the enter function (recursively)
    for (const child of this.children) {
      child._readyCaller();
    }
    this.innerState = PNodeState.READY;
    this.onReady();
  }

  /**
   * Runs whenever this node goes from ready -> active.
   *
   * Examples:
   * - When this is added in the scene's constructor, and the scene becomes active
   * - When the parent scene goes from active -> ready,
   *   then switches back to active
   */
  protected onEnter() {}

  /** @internal */
  public _enterCaller() {
    // Call the enter function (recursively)
    for (const child of this.children) {
      child._enterCaller();
    }
    this.innerState = PNodeState.ACTIVE;
    this.onEnter();
  }

  /**
   * Runs whenever this node goes from active -> ready.
   *
   * Examples:
   * -
   */
  protected onSuspend() {}

  /** @internal */
  public _suspendCaller() {
    // Call the enter function (recursively)
    for (const child of this.children) {
      child._suspendCaller();
    }
    this.innerState = PNodeState.READY;
    this.onSuspend();
  }

  /**
   * Runs whenever this node goes from any state -> destroyed.
   *
   * Examples:
   * - When this node is removed from the scene tree
   * - When the engine switches from this node's parent scene to another,
   *   regardless of if it's unloaded or stays loaded
   */
  protected onExit() {}

  /** @internal */
  public _exitCaller() {
    // Call the exit function (recursively)
    for (const child of this.children) {
      child._exitCaller();
    }
    this.innerState = PNodeState.DESTROYED;
    this.onExit();
  }

  // --- PROCESSING ---

  /**
   * This determines whether or not this node is paused. Paused nodes don't get
   * their `.process()` method called, nor their children's. Because of this,
   * the unpause functionality has to be outside the node's process method,
   * like in a callback, signal, or parent method.
   */
  public isPaused = false;

  /** Pauses this node */
  public pause(): this {
    this.isPaused = true;
    return this;
  }
  /** Pauses this node */
  public unpause(): this {
    this.isPaused = false;
    return this;
  }

  /**
   * Processes game logic! Ran every frame at some point before `.draw()`,
   * but shouldn't be used for drawing things!
   *
   * Calls the parent's {@link PNode#process} first, then its children's.
   */
  protected process() {}

  /** @internal */
  public _processCaller() {
    if (this.isPaused) return;

    // Call the process function (recursively)
    this.process();
    for (const child of this.children) {
      child._processCaller();
    }
  }

  // --- VISUAL ---

  /** Whether or not this node is hidden */
  public isVisible: boolean = true;

  /** Hides this node */
  public hide(): this {
    this.isVisible = false;
    return this;
  }
  /** Shows this node */
  public show(): this {
    this.isVisible = true;
    return this;
  }

  /**
   * Sets this node's hidden state.
   * Same as using hide/show, but only changes if the state is different.
   */
  public setVisibility(isVisible: boolean) {
    this.isVisible = isVisible;
  }

  /**
   * Draws this node! This should only be used for visuals, not for any
   * important game logic, as it's not guaranteed that this function will run
   * consistently. If you want consistency, look at `.process()`!
   *
   * Note that the coordinate system is transformed so that the origin (0, 0)
   * is at the node's position. Child nodes are rendered after this node,
   * so they appear in front of it.
   *
   * Calls the parent's {@link PNode#draw}, then its children's.
   */
  protected draw() {}

  /** @internal */
  public _drawCaller() {
    // Don't draw if hidden!
    if (!this.isVisible) return;

    // Set this transform
    const transform = Peek.getTransform();

    if (Peek.snapToGrid) {
      Peek.translate(Math.floor(this.pos.x), Math.floor(this.pos.y));
    } else {
      const scale = Peek.getPixelScale();
      Peek.translate(
        Math.floor(this.pos.x * scale) / scale,
        Math.floor(this.pos.y * scale) / scale,
      );
    }

    // Call the draw function (recursively)
    this.draw();
    for (const child of this.children) {
      child._drawCaller();
    }

    // Un-transform
    Peek.setTransform(transform);
  }

  // --- MISC HELPERS ---

  /**
   * Runs the given function (immediately) with this node as its argument. This
   * is meant to be used for setup, or quick (small) functions. Try not to put
   * a lot of game logic here!
   * @param fn The function that will be ran
   * @returns this
   */
  public run(fn: (node: this) => void): this {
    fn(this);
    return this;
  }

  /** Gets this node's hitbox. */
  public getHitbox(
    integer: boolean,
    hitBoxObj?: HitBox,
    centered = true,
  ): HitBox {
    // Get the starting position
    const ret = hitBoxObj ?? new SquareBox(0, 0);
    ret.x = this.pos.x;
    ret.y = this.pos.y;

    // Add parent transforms
    let parent = this.innerParent;
    while (parent !== undefined) {
      ret.x += parent.pos.x;
      ret.y += parent.pos.y;
      parent = parent.innerParent;
    }

    // Center square hitboxes
    if (centered && ret instanceof SquareBox) {
      ret.x -= ret.w * 0.5;
      ret.y -= ret.h * 0.5;
    }

    // Round
    if (integer) {
      ret.x = Math.floor(ret.x);
      ret.y = Math.floor(ret.y);
    }

    return ret;
  }

  public zCropRadius = 5;

  /** Sets the padding distance for occluding in a ZSort node */
  public setZCropRadius(radius: number): this {
    this.zCropRadius = radius;
    return this;
  }

  /**
   * Gets a single node at a given position, searching breadth-first
   * @param pos The position (world-space) to check at
   * @returns The found node, if any
   */
  public getNodeAt(pos: Vec2): PNode | undefined {
    return this.getNodesAt(pos, 1)[0];
  }

  /**
   * Gets nodes at a given position, searching breadth-first.
   * @param pos The position (world-space) to check at
   * @param count The number of nodes to retrieve
   * @returns The list of found nodes
   */
  public getNodesAt(pos: Vec2, count: number): PNode[] {
    const hits: PNode[] = [];

    const queue: PNode[] = [this];
    while (queue.length > 0) {
      const node = queue.shift()!;

      // Check if it falls within the position
      if (pointIsInHitbox(pos, node.getHitbox(false))) {
        hits.push(node);
      }

      if (hits.length === count) {
        break;
      }

      // Add its children to the queue
      queue.push(...node.getChildren());
    }

    return hits;
  }
}
