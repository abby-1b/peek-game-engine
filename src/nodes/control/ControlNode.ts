import { Peek } from '../../peek';
import { HitBox, SquareBox } from '../../resources/HitBox';
import { BlendMode, BlendModeChangeable } from '../../util/BlendMode';
import { PNode } from '../PNode';

const enum SizeType {
  /** A value in pixels */
  PIXELS,

  /** A value from 0 to 1  */
  FRACTION,

  /**
   * Calculated by each individual node,
   * this sets the size to fit the content.
   */
  MINIMUM,
}
type ControlNodeSize = [ number, SizeType ];

interface ControlNodeProperties {
  /** Whether or not children are positioned at all */
  positionChildren: boolean,

  /** Whether or not children are horizontally aligned */
  horizontalAlign: boolean,

  /** Used to know when to re-calculate sizes */
  lastUpdateFrame: number,

  /** The number of Control nodes this parent has */
  childCount: number,

  sizeMultiplier: number,

  currentChildOffset: number,
}

/** A node with layout information. Cannot be instantiated itself! */
export abstract class ControlNode extends PNode implements BlendModeChangeable {
  public width: ControlNodeSize = [ 1, SizeType.FRACTION ];
  public height: ControlNodeSize = [ 1, SizeType.FRACTION ];
  public controlProperties?: ControlNodeProperties;

  public blendMode: BlendMode = BlendMode.NORMAL;

  // Used for children to know their parent's size
  protected calculatedWidth  = 0;
  protected calculatedHeight = 0;

  protected hitBox = new SquareBox(0, 0);

  /** Sets this node's width in pixels */
  public setWidthPixels(width: number): this {
    this.width[0] = width;
    this.width[1] = SizeType.PIXELS;
    return this;
  }
  
  /** Sets this node's width as a fraction (relative to the parent) */
  public setWidthFraction(width: number): this {
    this.width[0] = width;
    this.width[1] = SizeType.FRACTION;
    return this;
  }
  
  /** Sets this node's height in pixels */
  public setHeightPixels(height: number): this {
    this.height[0] = height;
    this.height[1] = SizeType.PIXELS;
    return this;
  }
  
  /** Sets this node's height as a fraction (relative to the parent) */
  public setHeightFraction(height: number): this {
    this.height[0] = height;
    this.height[1] = SizeType.FRACTION;
    return this;
  }

  /** Sets this node's width and height in pixels */
  public setSizePixels(width: number, height: number): this {
    this.setWidthPixels(width);
    this.setHeightPixels(height);
    return this;
  }

  /** Sets this node's width and height in pixels */
  public setSizeFraction(width: number, height: number): this {
    this.setWidthFraction(width);
    this.setHeightFraction(height);
    return this;
  }

  /** Sets this node's blend mode */
  public setBlendMode(blendMode: BlendMode): this {
    this.blendMode = blendMode;
    return this;
  }

  /** Draws this control node */
  protected override draw() {
    const parent: PNode & { controlProperties?: ControlNodeProperties }
      = this.parent;
    let parentWidth  = Peek.screenWidth;
    let parentHeight = Peek.screenHeight;
    if (parent instanceof ControlNode) {
      parentWidth  = parent.calculatedWidth ;
      parentHeight = parent.calculatedHeight;
    }

    if (!parent.controlProperties) {
      // Initialize parent control properties!
      parent.controlProperties = {
        positionChildren: false,
        lastUpdateFrame: 0,
        childCount: 0,
        sizeMultiplier: 1,
        currentChildOffset: 0,
        horizontalAlign: false
      };
    }
    if (parent.controlProperties!.lastUpdateFrame < Peek.frameCount) {
      // Update parent control properties!
      parent.controlProperties!.lastUpdateFrame = Peek.frameCount;
      parent.controlProperties!.childCount = 0;

      parent.controlProperties!.currentChildOffset = 0;

      if (parent.controlProperties!.positionChildren) {
        // Children need to be positioned
        let totalSize = 0;
        for (const child of parent.getChildren()) {
          if (!(child instanceof ControlNode)) { continue; }
  
          parent.controlProperties!.childCount++;
  
          const size = parent.controlProperties!.horizontalAlign
            ? child.width
            : child.height;
          if (size[1] === SizeType.PIXELS) {
            totalSize += size[0] / parentHeight;
          } else {
            totalSize += size[0];
          }
        }
  
        parent.controlProperties!.sizeMultiplier = 1 / totalSize;
      } else {
        // Children don't need to be positioned
        parent.controlProperties!.sizeMultiplier = 1;
      }
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
        Math.floor(parentHeight * parent.controlProperties!.currentChildOffset),
        0
      );
    } else {
      Peek.ctx.translate(
        0,
        Math.floor(parentHeight * parent.controlProperties!.currentChildOffset)
      );
    }

    // Call this innerDraw method
    this.calculatedWidth = Math.floor(widthMultiplier * (
      this.width[1] === SizeType.FRACTION
        ? this.width[0] * parentWidth
        : this.width[0]
    ));
    this.calculatedHeight = Math.floor(heightMultiplier * (
      this.height[1] === SizeType.FRACTION
        ? this.height[0] * parentHeight
        : this.height[0]
    ));
    this.innerDraw(this.calculatedWidth, this.calculatedHeight);
    this.hitBox.setSize(this.calculatedWidth, this.calculatedHeight);

    // Un-transform
    Peek.ctx.setTransform(transform);

    // Move on to the next child!
    if (parent.controlProperties!.positionChildren) {
      if (parent.controlProperties!.horizontalAlign) {
        parent.controlProperties!.currentChildOffset +=
          parent.controlProperties!.sizeMultiplier * (
            this.width[1] === SizeType.FRACTION
              ? this.width[0]
              : this.width[0] / parentHeight
          );
      } else {
        parent.controlProperties!.currentChildOffset +=
          parent.controlProperties!.sizeMultiplier * (
            this.height[1] === SizeType.FRACTION
              ? this.height[0]
              : this.height[0] / parentHeight
          );
      }
    }
  }
  
  /** Gets this sprite's hitbox */
  public override getHitbox(integer: boolean): HitBox {
    return super.getHitbox(integer, this.hitBox, false);
  }

  protected abstract innerDraw(width: number, height: number): void;
}
