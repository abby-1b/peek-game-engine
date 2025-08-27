/**
 * The controller class!
 * 
 * `(string & {})` is used extensively here to provide
 * partial and flexible autocomplete for button names.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Vec2 } from '../resources/Vec';
import { ButtonInit, ButtonState, InputType } from './inputs/Input';
import { Keyboard } from './inputs/Keyboard';
import { Mouse, MouseButton } from './inputs/Mouse';

const ALL_INPUTS = [ Mouse, Keyboard ];
// TODO: Touch, GamePad

interface ControllerInit<K extends string> {
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
  buttons?: Record<K, ButtonInit>
}

type ButtonCallback = () => void;

/** Binds many input types together. */
export class Controller<K extends string>  {
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
  public buttons: Record<K, boolean>;
  
  /** Callbacks for when a button is pressed. */
  private buttonDownCallbacks: Record<string, ButtonCallback[]> = {};
  private buttonUpCallbacks: Record<string, ButtonCallback[]> = {};

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

  /** Makes a controller. Called internally from `Controller.new()`. */
  public constructor(init: ControllerInit<K>) {
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
          if (button === MouseButton.LEFT) {
            this.lastDragPos.setVec(this.pointer);
            this.triggerButton('pointer', state);
            this.pointerDown = state === ButtonState.PRESSED;
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
          const direction = ([ 'up', 'down', 'left', 'right' ] as const)[idx];
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
    const keyboardButtonMappings: Record<string, K> = {};
    // Const gamePadButtonMappings: Record<string, string> = {};
    
    this.buttons = {} as Record<K, boolean>;
    if (init.buttons) {
      for (const buttonName in init.buttons) {
        // Initialize pressed state to false
        this.buttons[buttonName] = false;
  
        const buttonInit = init.buttons![buttonName];
        buttonInit.keyboardKeys
          ?.forEach(k => keyboardButtonMappings[k] = buttonName);
      }
    }

    Keyboard.pipe(
      InputType.Button,
      (button: string | number, state: ButtonState) => {
        if (button in keyboardButtonMappings) {
          const buttonName = keyboardButtonMappings[button];
          this.triggerButton(buttonName as string, state);
          this.buttons[buttonName] =
            state === ButtonState.PRESSED;
        }
      },
      this
    );

    Controller.finalizationRegistry.register(this, this.id);
  }

  /** Runs when a button is pressed/released */
  private triggerButton(buttonName: string, state: ButtonState) {
    if (state === ButtonState.PRESSED) {
      this.buttonDownCallbacks[buttonName]?.forEach(c => c());
    } else if (state === ButtonState.UNPRESSED) {
      this.buttonUpCallbacks[buttonName]?.forEach(c => c());
    }
  }

  /**
   * Adds a callback that runs when a button is pressed
   * @param buttonName The name of the button to add the callback
   * @param callback The callback
   */
  public onPress(
    // eslint-disable-next-line @typescript-eslint/ban-types
    buttonName: K | (string & {}),
    callback: ButtonCallback
  ) {
    if (!(buttonName in this.buttonDownCallbacks)) {
      this.buttonDownCallbacks[buttonName] = [ callback ];
    } else {
      this.buttonDownCallbacks[buttonName].push(callback);
    }
  }
  
  /**
   * Adds a callback that runs when a button is released
   * @param buttonName The name of the button to add the callback
   * @param callback The callback
   */
  public onRelease(
    // eslint-disable-next-line @typescript-eslint/ban-types
    buttonName: K | (string & {}),
    callback: ButtonCallback
  ) {
    if (!(buttonName in this.buttonUpCallbacks)) {
      this.buttonUpCallbacks[buttonName] = [ callback ];
    } else {
      this.buttonUpCallbacks[buttonName].push(callback);
    }
  }

  /**
   * Removes a button callback. If no callback is passed, all callbacks for that
   * button are removed. If the callback was added multiple times, only the
   * first instance will be removed (this might change in the future).
   * @param buttonName The name of the button to remove callbacks for
   * @param callback The callback to remove
   */
  public removeOnPress(
    // eslint-disable-next-line @typescript-eslint/ban-types
    buttonName: K | (string & {}),
    callback?: ButtonCallback
  ) {
    if (!(buttonName in this.buttonDownCallbacks)) {
      // There is no callback...
      return;
    }

    if (callback) {
      // Find the callback index...
      const callbacks = this.buttonDownCallbacks[buttonName];
      const idx = callbacks.indexOf(callback);
      
      // Remove the callback
      if (idx !== -1) {
        callbacks.splice(idx, 1);
      }
    } else {
      // Remove all callbacks!
      delete this.buttonDownCallbacks[buttonName];
    }
  }
  
  /**
   * Removes a button callback. If no callback is passed, all callbacks for that
   * button are removed. If the callback was added multiple times, only the
   * first instance will be removed (this might change in the future).
   * @param buttonName The name of the button to remove callbacks for
   * @param callback The callback to remove
   */
  public removeOnRelease(
    // eslint-disable-next-line @typescript-eslint/ban-types
    buttonName: K | (string & {}),
    callback?: ButtonCallback
  ) {
    if (!(buttonName in this.buttonUpCallbacks)) {
      // There is no callback...
      return;
    }

    if (callback) {
      // Find the callback index...
      const callbacks = this.buttonUpCallbacks[buttonName];
      const idx = callbacks.indexOf(callback);
      
      // Remove the callback
      if (idx !== -1) {
        callbacks.splice(idx, 1);
      }
    } else {
      // Remove all callbacks!
      delete this.buttonUpCallbacks[buttonName];
    }
  }

  /** An array of callbacks, stored here so they don't get garbage collected. */
  public callbacks: Array<(...args: any[]) => any> = [];
}
