import { error } from '../errors.ts';
import { Resource } from './Resource.ts';
import { Vec2 } from './vector.ts';

/** Node2D is the base for everything that appears on the screen. */
export class Node2D extends Resource {
  public visible = true;
  public parent: Node2D | undefined;
  protected children: Node2D[] = [];
  public position: Vec2 = new Vec2(0, 0);
  public size: Vec2 = new Vec2(0, 0);
  public rotation: number = 0;
  public name?: string;

  /** Sets the name of the node (optionally) */
  public constructor(name?: string) {
    super();
    this.name = name;
  }

  /** Adds a child to a node */
  public addChild(child: Node2D) {
    this.children.push(child);
    child.parent = this;
  }

  /** Removes a specific child from this node */
  public removeChild(child: Node2D) {
    const idx = this.children.indexOf(child);
    if (idx == -1) {
      error(`Child couldn't be removed (doesn't exist): ${child}`);
      return;
    }
    this.children.splice(idx, 1);
  }

  /** Runs every frame */
  public frame(delta: number) {
    delta;
  }
}
