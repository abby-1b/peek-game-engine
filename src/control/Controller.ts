/**
 * The controller class!
 *
 * `(string & {})` is used extensively here to provide
 * partial and flexible autocomplete for button names.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { PNode, PNodeState } from '../nodes/PNode';
import { Vec2 } from '../resources/Vec';
import { PGamepad, PGamepadButton } from './inputs/Gamepad';
import { ButtonInit, ButtonState, InputType } from './inputs/Input';
import { Keyboard } from './inputs/Keyboard';
import { Mouse, MouseButton } from './inputs/Mouse';

// TODO: Touch

const ALL_INPUTS = [Mouse, Keyboard, PGamepad];

enum DirectionOutput {
  NONE = 0,
  MAIN_DIRECTION = 1,
  ALT_DIRECTION = 2,
}

/**
 * Configuration object for creating a new {@link Controller}.
 * @template K - String literal union for custom button names.
 */
interface ControllerInit<K extends string> {
  /**
   * Pointer (mouse/touch) configuration.
   * Enables handling of cursor/finger position and primary button (left click / tap).
   */
  pointer?: {
    /** Whether to enable mouse input (position + left button). */
    mouse?: boolean;
    /** Whether to enable touch input (position + tap). Currently planned, not implemented. */
    touch?: boolean;
  };

  /**
   * Directional input configuration (produces a normalized `direction` vector with XY in [-1,1]).
   * Combines inputs from keyboard and/or gamepad to control the same `direction` property.
   */
  directional?: {
    /**
     * Keyboard mapping for directional input.
     * The resulting direction is computed by combining active keys (up/down/left/right).
     */
    keyboard?: {
      /** Use W (up), A (left), S (down), D (right) keys. */
      wasd?: boolean;
      /** Use arrow keys. */
      arrows?: boolean;
      /**
       * Custom key mappings per direction.
       * Each array contains keyboard key strings (e.g., `'KeyW'`, `'Space'`, `'ShiftLeft'`).
       */
      custom?: {
        up: string[];
        down: string[];
        left: string[];
        right: string[];
      };
      /** Which direction output this input affects. Defaults to `'main'`. */
      target?: 'main' | 'alt' | 'none';
    };

    /**
     * Gamepad mapping for directional input.
     * Can use the D-pad and/or analog sticks.
     */
    gamepad?: {
      /** Use D-pad buttons (up/down/left/right). */
      dPad?: boolean;
      /** Use left analog stick (provides smooth analog direction). */
      leftStick?: boolean;
      /** Use right analog stick */
      rightStick?: boolean;
      /** Which direction output this input affects. Defaults to `'main'`. */
      target?: 'main' | 'alt' | 'none';
    };

    /**
     * How much to quantize the main input direction,
     * lerping towards the four cardinal directions.
     * 0 = no quantization, 1 = fully quantized to nearest cardinal direction.
     */
    quantize?: number;

    /**
     * How much to quantize the alternate input direction,
     * lerping towards the four cardinal directions.
     * 0 = no quantization, 1 = fully quantized to nearest cardinal direction.
     */
    quantizeAlt?: number;

    /** Main direction magnitude below this value is snapped to zero. */
    deadzone?: number;

    /** Alternate direction magnitude below this value is snapped to zero. */
    deadzoneAlt?: number;
  };

  /**
   * Custom button mappings.
   * Keys are user-defined button names (e.g., `'action'`, `'jump'`, `'menu'`).
   * Values define which physical inputs trigger the button.
   */
  buttons?: Record<K, ButtonInit>;
}

type ButtonCallback = () => void;

/** Binds many input types together. */
export class Controller<K extends string> extends PNode {
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
   * The main direction, with XY components ranging from [-1, 1].
   * Normalized so its length will not exceed 1.
   */
  public direction: Vec2 = Vec2.zero();

  /**
   * The secondary direction, with XY components ranging from [-1, 1].
   * Normalized so its length will not exceed 1.
   */
  public directionAlt: Vec2 = Vec2.zero();

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
        touch: true,
      },
      directional: {
        keyboard: {
          wasd: true,
          arrows: true,
          target: 'main',
        },
        gamepad: {
          dPad: true,
          leftStick: true,
          target: 'main',
        },
      },
      buttons: {
        action: {
          keyboardKeys: [' ', 'Enter'],
          gamePadButtons: ['A'],
        },
      },
    });
  }

  /** Makes a controller. Called internally from `Controller.new()`. */
  public constructor(init: ControllerInit<K>) {
    super();

    // Setup this controller ID
    this.id = Controller.currentID;
    Controller.currentID++;

    // Directional processing parameters
    let deadzoneMain = 0;
    let deadzoneAlt = 0;
    let quantizeMain = 0;
    let quantizeAlt = 0;

    // Target selection for each input source
    let keyboardTarget = DirectionOutput.MAIN_DIRECTION;
    let gamepadTarget = DirectionOutput.MAIN_DIRECTION;

    if (init.directional) {
      deadzoneMain = init.directional.deadzone ?? 0;
      deadzoneAlt = init.directional.deadzoneAlt ?? deadzoneMain;
      quantizeMain = init.directional.quantize ?? 0;
      quantizeAlt = init.directional.quantizeAlt ?? 0;

      if (init.directional.keyboard) {
        const kbTarget = init.directional.keyboard.target;
        if (kbTarget === 'alt') keyboardTarget = DirectionOutput.ALT_DIRECTION;
        else if (kbTarget === 'none') keyboardTarget = DirectionOutput.NONE;
        else keyboardTarget = DirectionOutput.MAIN_DIRECTION;
      }
      if (init.directional.gamepad) {
        const gpTarget = init.directional.gamepad.target;
        if (gpTarget === 'alt') gamepadTarget = DirectionOutput.ALT_DIRECTION;
        else if (gpTarget === 'none') gamepadTarget = DirectionOutput.NONE;
        else gamepadTarget = DirectionOutput.MAIN_DIRECTION;
      }
    }

    // Helper to apply deadzone and quantization to a direction vector
    const applyProcessing = (dir: Vec2, isAlt: boolean): Vec2 => {
      const deadzone = isAlt ? deadzoneAlt : deadzoneMain;
      const quantize = isAlt ? quantizeAlt : quantizeMain;

      // Deadzone
      const len = dir.length();
      if (len < deadzone) {
        dir.set(0, 0);
        return dir;
      } else if (deadzone > 0 && len > 0) {
        const scale = (len - deadzone) / (1 - deadzone);
        dir.x *= scale / len;
        dir.y *= scale / len;
      }

      // Quantization (lerp towards nearest cardinal direction)
      if (quantize > 0 && len > 0) {
        const angle = Math.atan2(dir.y, dir.x);
        let quadrant = Math.round(angle / (Math.PI / 2));
        quadrant = ((quadrant % 4) + 4) % 4;
        let targetAngle = quadrant * (Math.PI / 2);
        let diff = angle - targetAngle;
        if (Math.abs(diff) > Math.PI / 4) {
          targetAngle += Math.PI;
          diff = angle - targetAngle;
        }
        const newAngle = angle + diff * (1 - quantize);
        const newX = Math.cos(newAngle);
        const newY = Math.sin(newAngle);
        dir.set(newX, newY);
      }

      return dir;
    };

    const setDirectionForTarget = (
      target: DirectionOutput,
      x: number,
      y: number,
    ) => {
      if (target === DirectionOutput.NONE) return;
      const isAlt = target === DirectionOutput.ALT_DIRECTION;
      const dirVec = isAlt ? this.directionAlt : this.direction;
      dirVec.set(x, y);
      applyProcessing(dirVec, isAlt);
    };

    if (init.pointer) {
      if (init.pointer.mouse) {
        // Mouse
        Mouse.pipe(
          InputType.Position,
          (x, y) => {
            this.pointer.set(x, y);
            if (this.pointerDown) {
              this.aggregateDrag.add(
                this.pointer.x - this.lastDragPos.x,
                this.pointer.y - this.lastDragPos.y,
              );
              this.lastDragPos.setVec(this.pointer);
            }
          },
          this,
        );
        Mouse.pipe(
          InputType.Button,
          (button, state) => {
            if (button === MouseButton.LEFT) {
              this.lastDragPos.setVec(this.pointer);
              this.triggerButton('pointer', state);
              this.pointerDown = state === ButtonState.PRESSED;
            }
          },
          this,
        );
      }

      if (init.pointer.touch) {
        // Touch (not yet implemented)
      }
    }

    if (init.directional) {
      if (init.directional.keyboard) {
        // Precompute directional keys
        const directionals: Record<string, number> = {};
        const wasd = 'wasd';
        const arrows = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
        for (const idx of [0, 1, 2, 3]) {
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
        const pressed = [0, 0, 0, 0];
        Keyboard.pipe(
          InputType.Button,
          (button: string | number, state: number) => {
            if (!(button in directionals)) return;
            pressed[directionals[button]] = state;
            let dx = pressed[3] - pressed[1];
            let dy = pressed[2] - pressed[0];
            if (dx !== 0 || dy !== 0) {
              const len = Math.hypot(dx, dy);
              if (len > 1) {
                dx /= len;
                dy /= len;
              }
            }
            setDirectionForTarget(keyboardTarget, dx, dy);
          },
          this,
        );
      }

      if (init.directional.gamepad) {
        if (init.directional.gamepad.dPad) {
          // Map D-pad buttons to direction
          const dpadMap: Record<string, number> = {
            [PGamepadButton.DPAD_UP]: 0,
            [PGamepadButton.DPAD_DOWN]: 2,
            [PGamepadButton.DPAD_LEFT]: 1,
            [PGamepadButton.DPAD_RIGHT]: 3,
          };

          const pressed = [0, 0, 0, 0];
          PGamepad.pipe(
            InputType.Button,
            (button: string | number, state: number) => {
              if (!(button in dpadMap)) return;
              pressed[dpadMap[button]] = state;
              let dx = pressed[3] - pressed[1];
              let dy = pressed[2] - pressed[0];
              if (dx !== 0 || dy !== 0) {
                const len = Math.hypot(dx, dy);
                if (len > 1) {
                  dx /= len;
                  dy /= len;
                }
              }
              setDirectionForTarget(gamepadTarget, dx, dy);
            },
            this,
          );
        }

        if (init.directional.gamepad.leftStick) {
          PGamepad.pipe(
            InputType.Direction,
            (x: number, y: number, stickName: string) => {
              if (stickName === 'leftStick') {
                setDirectionForTarget(gamepadTarget, x, y);
              }
            },
            this,
          );
        }

        if (init.directional.gamepad.rightStick) {
          PGamepad.pipe(
            InputType.Direction,
            (x: number, y: number, stickName: string) => {
              if (stickName === 'rightStick') {
                setDirectionForTarget(gamepadTarget, x, y);
              }
            },
            this,
          );
        }
      }
    }

    // Initialize buttons states
    const keyboardButtonMappings: Record<string, K> = {};
    const gamePadButtonMappings: Record<string, K> = {};

    this.buttons = {} as Record<K, boolean>;
    if (init.buttons) {
      for (const buttonName in init.buttons) {
        // Initialize pressed state to false
        this.buttons[buttonName] = false;

        const buttonInit = init.buttons![buttonName];
        buttonInit.keyboardKeys?.forEach(
          (k) => (keyboardButtonMappings[k] = buttonName),
        );
        buttonInit.gamePadButtons?.forEach(
          (k) => (gamePadButtonMappings[k] = buttonName),
        );
      }
    }

    Keyboard.pipe(
      InputType.Button,
      (button: string | number, state: ButtonState) => {
        if (button in keyboardButtonMappings) {
          const buttonName = keyboardButtonMappings[button];
          this.triggerButton(buttonName as string, state);
          this.buttons[buttonName] = state === ButtonState.PRESSED;
        }
      },
      this,
    );

    PGamepad.pipe(
      InputType.Button,
      (button: string | number, state: ButtonState) => {
        if (button in gamePadButtonMappings) {
          const buttonName = gamePadButtonMappings[button];
          this.triggerButton(buttonName as string, state);
          this.buttons[buttonName] = state === ButtonState.PRESSED;
        }
      },
      this,
    );

    Controller.finalizationRegistry.register(this, this.id);
  }

  /** Runs when a button is pressed/released */
  private triggerButton(buttonName: string, state: ButtonState) {
    if (this.state !== PNodeState.ACTIVE) return;
    if (state === ButtonState.PRESSED) {
      this.buttonDownCallbacks[buttonName]?.forEach((c) => c());
    } else if (state === ButtonState.UNPRESSED) {
      this.buttonUpCallbacks[buttonName]?.forEach((c) => c());
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
    callback: ButtonCallback,
  ) {
    if (!(buttonName in this.buttonDownCallbacks)) {
      this.buttonDownCallbacks[buttonName] = [callback];
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
    callback: ButtonCallback,
  ) {
    if (!(buttonName in this.buttonUpCallbacks)) {
      this.buttonUpCallbacks[buttonName] = [callback];
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
    callback?: ButtonCallback,
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
    callback?: ButtonCallback,
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

  /** Remove all callbacks! */
  public override onExit(): void {
    this.callbacks = [];
    this.buttonUpCallbacks = {};
    this.buttonDownCallbacks = {};
  }

  /** An array of callbacks, stored here so they don't get garbage collected. */
  public callbacks: Array<(...args: any[]) => any> = [];
}
