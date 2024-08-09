import { Peek } from '../peek';
import { Vec2 } from '../resources/Vec';
import { HitBox, pointIsInHitbox, SquareBox } from '../resources/HitBox';

/** Something that can be displayed on the screen */
export class PNode {
  /** Whether or not this node is hidden */
  public isHidden: boolean = false;

  /**
   * This determines whether or not this node is paused. Paused nodes don't get
   * their `.process()` method called, nor their children's. Because of this,
   * the unpause functionality has to be outside the node's process method,
   * like in a callback, signal, or parent method.
   */
  public isPaused = false;

  /** This node's position */
  public pos: Vec2 = Vec2.zero();

  /** This node's parent */
  public readonly parent!: PNode;

  /** Initializes a Node */
  public constructor() {}

  /** This node's children */
  private children: PNode[] = [];

  /** Gets this node's children */
  public getChildren(): ReadonlyArray<PNode> {
    return this.children;
  }

  /** Keeps track of if this node's preload function was already called */
  private isPreloaded: boolean = false;

  /** Keeps track of if this node's ready function was already called */
  private isReady: boolean = false;

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
    hitBoxObj?: HitBox
  ): HitBox {
    // Get the starting position
    let ret;
    if (hitBoxObj) {
      ret = hitBoxObj;
      hitBoxObj.x = this.pos.x;
      hitBoxObj.y = this.pos.y;
    } else {
      ret = new SquareBox(
        this.pos.x,
        this.pos.y,
        0, 0
      );
    }
    
    // Add parent transforms
    let parent = this.parent;
    while (parent != undefined) {
      ret.x += parent.pos.x;
      ret.y += parent.pos.y;
      parent = parent.parent;
    }

    // Center square hitboxes
    if (ret instanceof SquareBox) {
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
   * Keep in mind that this might return an empty array!
   * @param pos The position (world-space) to check at
   * @param count The number of nodes to retrieve
   * @returns The list of found nodes
   */
  public getNodesAt(
    pos: Vec2,
    count: number
  ): PNode[] {
    const hits: PNode[] = [];

    const queue: PNode[] = [ this ];
    while (queue.length > 0) {
      const node = queue.shift()!;

      // Check if it falls within the position
      if (pointIsInHitbox(pos, node.getHitbox(false))) {
        hits.push(node);
      }

      if (hits.length == count) {
        break;
      }

      // Add its children to the queue
      queue.push(...node.getChildren());
    }

    console.log(queue.length);

    return hits;
  }

  // CHILD METHODS
  
  /** Adds children to this node */
  public add(...children: PNode[]): this {
    for (const child of children) {
      if (!child.isPreloaded) {
        child.preloadCaller();
      }

      // Set the child's parent to be `this`
      // This is the only place that changes a child's parent
      (child as { parent: PNode }).parent = this;
      child.moved();

      // Add the child to our set of children
      (this.children as PNode[]).push(child);
    }

    // Return this
    return this;
  }

  /** Removes some children from this node */
  public remove(...children: PNode[]): this {
    /*
    This function is made to remove multiple children at once, so has a big
    performance optimization to make it faster than splicing each child out
    individually. First, it sets all the removed children to undefined, then it
    rolls the remaining children over to the empty spots.
    */

    // Replace children with undefined
    for (let i = 0; i < this.children.length; i++) {
      if (children.includes(this.children[i])) {
        (this.children[i] as { parent: PNode | undefined }).parent = undefined;
        this.children[i].moved();
        (this.children as unknown as (PNode | undefined)[])[i] = undefined;
      }
    }

    // Actually remove (roll children back)
    let insert = -1;
    let search = 0;
    const len = this.children.length;
    while (++insert < len) {
      if (this.children[insert] != undefined) continue;
      search = insert;
      while (
        search < len &&
        this.children[++search] == undefined
      );

      if (search >= len) break;

      this.children[insert] = this.children[search];
      (this.children as unknown as (PNode | undefined)[])[search] = undefined;
    }

    // Pop undefined from end
    while (
      this.children.length > 0 &&
      this.children[this.children.length - 1] == undefined
    ) this.children.pop();

    return this;
  }

  /** Removes children from this node given their indices */
  public removeIndex(...indices: number[]): this {
    return this.remove(...this.children.filter((c, i) => indices.includes(i)));
  }

  /** Removes this node from its parent. */
  public removeSelf() {
    if (this.parent) {
      this.parent.remove(this);
    }
  }

  /**
   * Ran when this node is "moved". Moving includes being 
   * added to a scene, being removed from a scene, or 
   * anything that changes this node's '.parent' property.
   */
  protected moved() {}

  // STATE METHODS

  /** Hides this node */
  public hide(): this {
    this.isHidden = true;
    return this;
  }
  /** Shows this node */
  public show(): this {
    this.isHidden = false;
    return this;
  }

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

  // PROCESSING METHODS

  /**
   * Calls `.preload()` after its children's. Used internally
   * by the engine to make overriding easier!
   */
  public async preloadCaller() {
    // Preload children first (recursively)
    for (const child of this.children) {
      await child.preloadCaller();
    }

    // Call *this* preload function after the children are loaded
    await this.preload();
    this.isPreloaded = true;
  }

  /**
   * Called at some point before the node is displayed. You should load assets,
   * add nodes, and do everything involved with *loading* in this method.
   * 
   * Mostly used for async things, or anything that could take a long time.
   */
  protected async preload() {}

  /**
   * Calls `.ready()` after its children's. Used internally
   * by the engine to make overriding easier! 
   */
  public readyCaller() {
    // Preload children first (recursively)
    for (const child of this.children) {
      child.readyCaller();
    }

    // Call *this* preload function after the children are loaded
    this.ready();
    this.isReady = true;
  }

  /**
   * Called at some point before the node is displayed.
   * It is guaranteed that this function will be called exactly once before
   * either `.process()` or `.draw()` are called.
   */
  protected ready() {}

  /**
   * Calls `.process()`, then its children's. This is used internally by the
   * engine to make overriding easier! If you want to override the process
   * method, try overriding `.process()`.
   */
  public processCaller(delta: number) {
    // TODO: if (this.isPaused)

    // Call the process function (recursively)
    this.process(delta);
    for (const child of this.children) {
      child.processCaller(delta);
    }
  }

  /**
   * Processes game logic! Ran every frame at some point before `.draw()`,
   * but shouldn't be used for drawing things!
   */
  protected process(delta: number) { delta; }

  /**
   * Calls `.draw()`, then its children's. This is used internally by the
   * engine to make overriding easier! If you want to override the draw method,
   * try overriding `.draw()`.
   */
  public drawCaller() {
    // Don't draw if hidden!
    if (this.isHidden) return;

    // Set this transform
    const transform = Peek.ctx.getTransform();
    Peek.ctx.translate(Math.floor(this.pos.x), Math.floor(this.pos.y));

    // Call the draw function (recursively)
    this.draw();
    for (const child of this.children) {
      child.drawCaller();
    }
    
    // Un-transform
    Peek.ctx.setTransform(transform);
  }

  /**
   * Draws this node! This should only be used for visuals, not for any
   * important game logic, as it's not guaranteed that this function will run
   * consistently. If you want consistency, look at `.process()`!
   * 
   * Note that the coordinate system is transformed so that the origin (0, 0)
   * is at the node's position. Also, child nodes are rendered after this node,
   * so they appear in front of it.
   */
  protected draw() {}

}
