import { Peek } from '../peek';
import { PNode } from './PNode';

/**
 * A node that draws its children sorted by their Y position,
 * from lowest Y (top) to highest Y (bottom)
 * This creates a depth illusion where objects lower on screen appear in front
 */
export class ZSort extends PNode {
  protected drawIndices: number[] = [];
  private innerMargin: number = 32;

  /** Recalculates the order of the draw indices */
  private recalculateIndices(): void {
    this.drawIndices = new Array(this.getChildren().length);
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
   * Overrides the default draw behavior to render children in Y-sorted order
   * Only nodes within the camera view, plus a margin, are processed
   */
  protected override draw(): void {
    const visibleChildren = this.getChildren().filter((child) => {
      const inView = Peek.isInCamera(
        child.pos,
        this.innerMargin + child.zCropRadius,
      );
      return child.isVisible && inView;
    });

    const sortedChildren = [...visibleChildren].sort(
      (a, b) => a.pos.y - b.pos.y,
    );

    for (const child of sortedChildren) {
      child._drawCaller();
    }
  }

  /**
   * Overrides the default drawCaller to prevent double-drawing of children,
   * since we handle child drawing in our custom draw() method
   */
  public override _drawCaller(): void {
    if (!this.isVisible) {
      return;
    }

    const transform = Peek.getTransform();
    Peek.translate(Math.floor(this.pos.x), Math.floor(this.pos.y));

    this.draw();

    Peek.setTransform(transform);
  }
}
