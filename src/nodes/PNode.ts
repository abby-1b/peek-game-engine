import { Peek } from '../peek';
import { Vec2 } from '../resources/Vec';
import { HitBox } from '../util/HitBox';

/** Something that can be displayed on the screen */
export class PNode {
  /** Whether or not this node is hidden */
  public isHidden: boolean = false;

  /** This node's position */
  public pos: Vec2 = Vec2.zero();

  /** This node's parent */
  public readonly parent!: PNode;

  /** Initializes a Node */
  public constructor() {}

  /** This node's children */
  public children: PNode[] = [];

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
    xOffset: number = 0,
    yOffset: number = 0,
    overrideW: number = 0,
    overrideH: number = 0
  ): HitBox {
    const ret = {
      x: this.pos.x + xOffset, y: this.pos.y + yOffset,
      w: overrideW, h: overrideH
    };

    let parent = this.parent;
    while (parent != undefined) {
      ret.x += parent.pos.x;
      ret.y += parent.pos.y;
      parent = parent.parent;
    }
    // Ret.x = ~~ret.x;
    // Ret.y = ~~ret.y;

    return ret;
  }

  // CHILD METHODS
  
  /** Adds children to this node */
  public add(...children: PNode[]): this {
    for (const child of children) {
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

  /**
   * Ran when this node is "moved". Moving includes being added to a scene,
   * being reparented, being removed from a scene, or anything that changes this
   * node's '.parent' property.
   */
  protected moved() {}

  // PROCESSING METHODS

  /**
   * Calls this `.preload()`, then it's children's. Used internally by the
   * engine to make overriding easier!
   */
  private async preloadCaller() {
    // Preload children first (recursively)
    for (const child of this.children) {
      child.preloadCaller();
    }

    // Call *this* preload function after the children are loaded
    this.preload();
  }

  /**
   * Called at some point before the node is displayed.
   * It is guaranteed that this function will be called exactly once before
   * either `.process()` or `.draw()` are called.
   */
  protected async preload() {}

  /**
   * Called when the node and it's children are fully loaded. Only called once!
   */
  protected ready() {}

  /**
   * Calls `.process()`, then its children's. This is used internally by the
   * engine to make overriding easier! If you want to override the process
   * method, try overriding `.process()`.
   */
  private processCaller(delta: number) {
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
  private drawCaller() {
    // Don't draw if hidden!
    if (this.isHidden) return;

    // Set this transform
    const transform = Peek.ctx.getTransform();
    Peek.ctx.translate(~~this.pos.x, ~~this.pos.y);

    // Call the draw function (recursively)
    this.draw();
    for (const child of this.children) {
      child.drawCaller();
    }

    /*
    // Draw the hitbox!
    const hb = this.getHitbox();
    Peek.ctx.strokeStyle = `rgb(${nesting * 64}, 50, 50)`;
    Peek.ctx.beginPath();
    Peek.ctx.rect(
      hb.x + 0.5,
      hb.y + 0.5,
      hb.w == 0 ? 0.01 : hb.w - 1,
      hb.h == 0 ? 0.01 : hb.h - 1
    );
    Peek.ctx.stroke();
    */
    
    // Un-transform
    Peek.ctx.setTransform(transform);
  }

  /**
   * Draws this node! This should only be used for visuals, not for any
   * important game logic, as it's not guaranteed that this function will run
   * consistently. If you want consistency, look at `.process()`!
   * 
   * Other notes:
   *  - The transformation is set so (0, 0) points to the node's position
   *  - Child nodes are drawn *after* this one, so they appear in front of it
   */
  protected draw() {}

}
