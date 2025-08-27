import { Peek } from '../peek';
import { PNode } from './PNode';

/**
 * A node that draws its children sorted by their Y position,
 * from lowest Y (top) to highest Y (bottom).
 * This creates a depth illusion where objects lower on screen appear in front.
 */
export class ZSort extends PNode {
  protected drawIndices: number[] = [];

  /** Recalculates the order of the draw indices */
  private recalculateIndices() {
    this.drawIndices = new Array(this.getChildren.length);
  }

  /** Adds a child to this node, keeping everything sorted */
  public override add(...children: PNode[]): this {
    super.add(...children);
    this.recalculateIndices();
    return this;
  }

  /** Removes some children from this node, keeping everything sorted */
  public override remove(...children: PNode[]): this {
    super.remove(...children);
    this.recalculateIndices();
    return this;
  }

  /** 
   * Overrides the default draw behavior to render children in Y-sorted order.
   * Lower Y values (higher up on screen) are drawn first.
   */
  protected override draw(): void {
    // Get all visible children
    const visibleChildren = this.getChildren().filter(child => !child.isHidden);

    // Sort children by Y position (ascending)
    const sortedChildren = [ ...visibleChildren ]
      .sort((a, b) => a.pos.y - b.pos.y);

    // Draw children in sorted order
    for (const child of sortedChildren) {
      child.drawCaller();
    }
  }

  /**
   * Overrides the default drawCaller to prevent double-drawing of children,
   * since we handle child drawing in our custom draw() method
   */
  public override drawCaller(): void {
    if (this.isHidden) return;

    // Set transform for this node
    const transform = Peek.getTransform();
    Peek.translate(Math.floor(this.pos.x), Math.floor(this.pos.y));

    // Only call our draw method, which handles children
    this.draw();

    // Reset transform
    Peek.setTransform(transform);
  }
}