/* eslint-disable @typescript-eslint/no-explicit-any */
import { Vec2 } from '../resources/Vec';
import { ButtonInit, ButtonState, InputType } from './inputs/Input';
import { Keyboard } from './inputs/Keyboard';
import { Mouse, MouseButton } from './inputs/Mouse';

const ALL_INPUTS = [ Mouse, Keyboard ];
// TODO: Touch, GamePad

interface ControllerInit<T extends Record<string, ButtonInit>> {
  pointer?: {
    mouse?: boolean,
    touch?: boolean,
  },
  directional?: {
    keyboard?: {
      wasd?: boolean,
      arrows?: boolean,
      custom?: {
        up: string[],
        down: string[],
        left: string[],
        right: string[],
      }
    },
    gamepad?: {
      dPad?: boolean,
      leftStick?: boolean,
      rightStick?: boolean,
    }
  },

  /** Key-value pairs that dictate button names and their properties */
  buttons?: T
}

/** Binds many input types together. */
export class Controller<T extends Record<string, ButtonInit>>  {
  // STATIC

  private static currentID = 0;

  private static finalizationRegistry = (() => {
    return new FinalizationRegistry((controllerID: number) => {
      for (const input of ALL_INPUTS) {
        input.removeController(controllerID);
      }
    });
  })();

  // INSTANCE

  public id: number;

  /** A pointer position within the screen (aka a mouse or touch input) */
  public pointer: Vec2 = Vec2.zero();

  private lastDragPos = Vec2.zero();
  private aggregateDrag = Vec2.zero();
  private returnDrag = Vec2.zero();
  /** Gets the change in pointer position since the last call */
  public drag() {
    this.returnDrag.setVec(this.aggregateDrag);
    this.aggregateDrag.set(0, 0);
    return this.returnDrag;
  }

  /** Whether or not a pointer is down (touch or left click) */
  public pointerDown = false;

  /**
   * A direction with XY components ranging from [-1, 1].
   * Normalized so its length will not exceed 1.
   */
  public direction: Vec2 = Vec2.zero();

  /** A map of buttons and their states */
  public buttons: Record<keyof T, boolean>;

  /** Makes a controller with many input types built-in, pre-setup */
  public static simple() {
    return new Controller({
      pointer: {
        mouse: true,
        touch: true
      },
      directional: {
        keyboard: {
          wasd: true,
          arrows: true
        },
      },
      buttons: {
        'action': {
          keyboardKeys: [ ' ', 'Enter' ]
        }
      }
    });
  }

  /** Sets up a controller */
  public constructor(init: ControllerInit<T>) {
    // Setup this controller ID
    this.id = Controller.currentID;
    Controller.currentID++;

    if (init.pointer) {
      if (init.pointer.mouse) {
        // Mouse
        Mouse.pipe(InputType.Position, (x, y) => {
          this.pointer.set(x, y);
          if (this.pointerDown) {
            this.aggregateDrag.add(
              this.pointer.x - this.lastDragPos.x,
              this.pointer.y - this.lastDragPos.y
            );
            this.lastDragPos.setVec(this.pointer);
          }
        }, this);
        Mouse.pipe(InputType.Button, (button, state) => {
          if (button == MouseButton.LEFT) {
            this.lastDragPos.setVec(this.pointer);
            this.pointerDown = state == ButtonState.PRESSED;
          }
        }, this);
      }

      if (init.pointer.touch) {
        // Touch
        // Touch.pipe(InputType.Position, (x, y) => {
        //   this.pointer.set(x, y);
        // }, this);
      }
    }

    if (init.directional) {
      if (init.directional.keyboard) {
        // Precompute directional keys
        const directionals: Record<string, number> = {};
        const wasd = 'wasd';
        const arrows = [ 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight' ];
        for (const idx of [ 0, 1, 2, 3 ]) {
          const direction = (['up', 'down', 'left', 'right'] as const)[idx];
          if (init.directional.keyboard.wasd) directionals[wasd[idx]] = idx;
          if (init.directional.keyboard.arrows) directionals[arrows[idx]] = idx;
          if (init.directional.keyboard.custom?.[direction]) {
            init.directional.keyboard.custom[direction].forEach((e) => {
              directionals[e] = idx;
            });
          }
        }

        // Handle keyboard input
        const pressed = [ 0, 0, 0, 0 ];
        Keyboard.pipe(
          InputType.Button,
          (button: string | number, state: number) => {
            if (!(button in directionals)) return;
            pressed[directionals[button]] = state;
            this.direction.set(
              pressed[3] - pressed[1],
              pressed[2] - pressed[0]
            );
            if (this.direction.length() > 1) {
              this.direction.normalize();
            }
          },
          this
        );
      }
      // If (init.directional.gamepad) {
      //   Gamepad.pipe(InputType.Direction, (x, y) => {
      //     This.direction.set(x, y);
      //   }, this.id);
      // }
    }

    // Initialize buttons states
    const keyboardButtonMappings: Record<string, string> = {};
    // Const gamePadButtonMappings: Record<string, string> = {};
    
    this.buttons = {} as Record<keyof T, boolean>;
    if (init.buttons) {
      for (const buttonName in init.buttons) {
        // Initialize pressed state to false
        this.buttons[buttonName] = false;
  
        const buttonInit = init.buttons![buttonName];
        buttonInit.keyboardKeys
          ?.forEach(k => keyboardButtonMappings[k] = buttonName);
      }
    }

    Controller.finalizationRegistry.register(this, this.id);
  }


  /** An array of callbacks, stored here so they don't get garbage collected. */
  public callbacks: Array<(...args: any[]) => any> = [];
}
