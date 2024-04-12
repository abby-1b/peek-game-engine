import { Peek } from '../peek';
import { Vec2 } from '../resources/Vec';

/** Used to interface with mouse, keyboard, touch, and controllers */
export class Control {
  /** The current mouse position */
  public static mouse: Vec2 = Vec2.zero();

  /** Keyboard inputs that map to [up, left, down, right] */
  private static directionalKeys: [string[], string[], string[], string[]] = [
    [ 'w', 'ArrowUp' ],
    [ 'a', 'ArrowLeft' ],
    [ 's', 'ArrowDown' ],
    [ 'd', 'ArrowRight' ],
  ];
  
  /** Array of [up, left, down, right] */
  private static directionArray: [boolean, boolean, boolean, boolean] =
    [ false, false, false, false ];

  public static direction: Readonly<Vec2> = Vec2.zero();

  static {
    // Track mouse movement
    window.addEventListener('mousemove', e => {
      this.mouse.set(
        Peek.screenWidth  * (e.clientX / window.innerWidth ),
        Peek.screenHeight * (e.clientY / window.innerHeight)
      );
    });

    window.addEventListener('keydown', e => {
      for (let dir = 0; dir < 4; dir++) {
        this.directionArray[dir] ||= this.directionalKeys[dir].includes(e.key);
      }
      this.updateDirectionVec();
    });
    window.addEventListener('keyup', e => {
      for (let dir = 0; dir < 4; dir++) {
        this.directionArray[dir] = this.directionalKeys[dir].includes(e.key)
          ? false
          : this.directionArray[dir];
      }
      this.updateDirectionVec();
    });
  }

  /** Updates the `direction` vector with values from `directionArray` */
  private static updateDirectionVec() {
    this.direction.set(
      (this.directionArray[3] ? 1 : 0) + (this.directionArray[1] ? -1 : 0),
      (this.directionArray[0] ? -1 : 0) + (this.directionArray[2] ? 1 : 0),
    );
    this.direction.normalize();
  }

  /** Adds a set of directional keys */
  public static addDirectionalKeys(
    up   : string,
    left : string,
    down : string,
    right: string,
  ): void {
    const keys = [ up, left, down, right ];
    for (let i = 0; i < keys.length; i++) {
      const a = this.directionalKeys[i];
      if (a.includes(keys[i])) continue;
      a.push(keys[i]);
    }
  }

}
