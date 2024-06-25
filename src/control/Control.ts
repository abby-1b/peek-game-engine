/* eslint-disable @typescript-eslint/no-explicit-any */
import { Vec2 } from '../resources/Vec';
import { InputType } from './inputs/Input';
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

interface ButtonInit {
  keyboardKeys?: string[],
  gamePadButtons?: string[],
  mouseButtons: MouseButton[],
}

/** Binds many input types together */
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

  /**
   * A direction with XY components ranging from [-1, 1].
   * Normalized so its length will not exceed 1.
   */
  public direction: Vec2 = Vec2.zero();

  /** A map of buttons and their states */
  public buttons: Record<keyof T, boolean>;

  /** Sets up a controller */
  public constructor(init: ControllerInit<T>) {
    // Setup this controller ID
    this.id = Controller.currentID;
    Controller.currentID++;

    if (init.pointer) {
      if (init.pointer.mouse) {
        // Mouse
        Mouse.pipe(InputType.Position, this.controllerFn((x, y) => {
          this.pointer.set(x, y);
        }), this.id);
      }

      if (init.pointer.touch) {
        // Touch
        // Touch.pipe(InputType.Position, (x, y) => {
        //   This.pointer.set(x, y);
        // }, this.id);
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
          this.controllerFn((button: string, state: number) => {
            if (!(button in directionals)) return;
            pressed[directionals[button]] = state;
            this.direction.set(
              pressed[3] - pressed[1],
              pressed[2] - pressed[0]
            );
            if (this.direction.length() > 1) {
              this.direction.normalize();
            }
          }),
          this.id
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
    const gamePadButtonMappings: Record<string, string> = {};
    
    this.buttons = {} as Record<keyof T, boolean>;
    for (const buttonName in (init.buttons ?? {})) {
      // Initialize pressed state to false
      (this.buttons as any)[buttonName] = false;

      const buttonInit = init.buttons![buttonName];
      buttonInit.keyboardKeys
        ?.forEach(k => keyboardButtonMappings[k] = buttonName);
    }

    Controller.finalizationRegistry.register(this, this.id);
  }


  private callbacks: Array<(...args: any[]) => any> = [];

  /** Stores a callback in this class, so it can get garbage collected */
  private controllerFn(fn: (...args: any[]) => any) {
    this.callbacks.push(fn);
    return fn;
  }
}

/** Used to interface with mouse, keyboard, touch, and controllers */
export class Control {
  /** Adds a controller */
  public static addController<T extends Record<string, ButtonInit>>(
    controllerInit: ControllerInit<T>
  ): Controller<T> {
    const controller = new Controller(controllerInit);
    return controller;
  }

  /** Adds a controller with many input types built-in */
  public static simpleAddController() {
    return this.addController({
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
          keyboardKeys: [ ' ' ]
        }
      }
    });
  }
}
