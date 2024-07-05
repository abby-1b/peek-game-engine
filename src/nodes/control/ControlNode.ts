import { Peek } from '../../peek';
import { PNode } from '../PNode';

const enum SizeType {
  /** A value in pixels */
  PIXELS,

  /** A value from 0 to 1  */
  FRACTION,
}
type ControlNodeSize = [ number, SizeType ];

interface ControlNodeParent extends PNode {
  controlProperties?: {
    /** Whether or not children are horizontally aligned */
    horizontalAlign?: boolean,

    /** Used to know when to re-calculate sizes */
    lastUpdateFrame: number,

    /** The number of Control nodes this parent has */
    childCount: number,

    sizeMultiplier: number,

    currentChildOffset: number,
  }
}

/** A node with layout information. Cannot be instantiated itself! */
export abstract class ControlNode extends PNode {
  public width: ControlNodeSize = [ 1, SizeType.FRACTION ];
  public height: ControlNodeSize = [ 1, SizeType.FRACTION ];

  /** Sets this node's width in pixels */
  public setWidthPixels(width: number): this {
    this.width[0] = width;
    this.width[1] = SizeType.PIXELS;
    return this;
  }
  
  /** Sets this node's width in percent (relative to the parent) */
  public setWidthPercent(width: number): this {
    this.width[0] = width;
    this.width[1] = SizeType.PIXELS;
    return this;
  }
  
  /** Sets this node's height in pixels */
  public setHeightPixels(height: number): this {
    this.height[0] = height;
    this.height[1] = SizeType.PIXELS;
    return this;
  }
  
  /** Sets this node's height in percent (relative to the parent) */
  public setHeightPercent(height: number): this {
    this.height[0] = height;
    this.height[1] = SizeType.PIXELS;
    return this;
  }

  /** Draws this control node */
  protected draw() {
    const parent: PNode & ControlNodeParent = this.parent;
    const screenWidth = Peek.screenWidth;
    const screenHeight = Peek.screenHeight;

    if (!parent.controlProperties) {
      // Initialize parent control properties!
      parent.controlProperties = {
        lastUpdateFrame: 0,
        childCount: 0,

        sizeMultiplier: 1,

        currentChildOffset: 0,

        horizontalAlign: true
      };
    }
    if (parent.controlProperties!.lastUpdateFrame < Peek.frameCount) {
      // Update parent control properties!
      parent.controlProperties!.lastUpdateFrame = Peek.frameCount;
      parent.controlProperties!.childCount = 0;

      parent.controlProperties!.currentChildIndex = 0;
      parent.controlProperties!.currentChildOffset = 0;

      // Let totalScreenWidth = 0;
      let totalSize = 0;
      for (const child of parent.children) {
        if (!(child instanceof ControlNode)) { continue; }

        parent.controlProperties!.childCount++;

        // If (child.width[1] == ControlNodeSizeType.PIXELS) {
        //   TotalScreenWidth += child.width[0] / screenWidth;
        // } else {
        //   TotalScreenWidth += child.width[0];
        // }

        const size = parent.controlProperties!.horizontalAlign
          ? child.width
          : child.height;
        if (size[1] == SizeType.PIXELS) {
          totalSize += size[0] / screenHeight;
        } else {
          totalSize += size[0];
        }
      }

      parent.controlProperties!.sizeMultiplier = 1 / totalSize;
    }

    const widthMultiplier = parent.controlProperties!.horizontalAlign
      ? parent.controlProperties!.sizeMultiplier
      : 1;
    const heightMultiplier = parent.controlProperties!.horizontalAlign
      ? 1
      : parent.controlProperties!.sizeMultiplier;

    // Set this transform
    const transform = Peek.ctx.getTransform();
    if (parent.controlProperties!.horizontalAlign) {
      Peek.ctx.translate(
        ~~(screenHeight * parent.controlProperties!.currentChildOffset),
        0
      );
    } else {
      Peek.ctx.translate(
        0,
        ~~(screenHeight * parent.controlProperties!.currentChildOffset)
      );
    }

    // Call this innerDraw method
    this.innerDraw(
      ~~(widthMultiplier * (
        this.width[1] == SizeType.FRACTION
          ? this.width[0] * screenWidth
          : this.width[0]
      )),
      ~~(heightMultiplier * (
        this.height[1] == SizeType.FRACTION
          ? this.height[0] * screenWidth
          : this.height[0]
      ))
    );

    // Un-transform
    Peek.ctx.setTransform(transform);

    // Move on to the next child!
    if (parent.controlProperties!.horizontalAlign) {
      parent.controlProperties!.currentChildOffset +=
        parent.controlProperties!.sizeMultiplier * (
          this.width[1] == SizeType.FRACTION
            ? this.width[0]
            : this.width[0] / screenHeight
        );
    } else {
      parent.controlProperties!.currentChildOffset +=
        parent.controlProperties!.sizeMultiplier * (
          this.height[1] == SizeType.FRACTION
            ? this.height[0]
            : this.height[0] / screenHeight
        );
    }
  }

  protected abstract innerDraw(width: number, height: number): void;
}
