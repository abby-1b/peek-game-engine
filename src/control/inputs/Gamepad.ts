/* eslint-disable @typescript-eslint/no-explicit-any */
import { ButtonState, Input, InputType } from './Input';

/** Standard gamepad button names based on Xbox controller layout */
export enum PGamepadButton {
  A = 'A',
  B = 'B',
  X = 'X',
  Y = 'Y',
  LB = 'LB',
  RB = 'RB',
  LT = 'LT',
  RT = 'RT',
  BACK = 'Back',
  START = 'Start',
  LEFT_STICK = 'LeftStick',
  RIGHT_STICK = 'RightStick',
  DPAD_UP = 'DPadUp',
  DPAD_DOWN = 'DPadDown',
  DPAD_LEFT = 'DPadLeft',
  DPAD_RIGHT = 'DPadRight',
}

/** Handles all gamepad inputs */
export class PGamepadInput extends Input {
  private gamepads: (Gamepad | null)[] = [];
  private animationFrameId: number | null = null;
  private connectedListener?: (e: GamepadEvent) => void;
  private disconnectedListener?: (e: GamepadEvent) => void;
  
  // Store previous button states to detect changes
  private previousButtons: boolean[][] = [];
  // Store previous axis values to detect changes
  private previousAxes: number[][] = [];

  /** Called when an input is attached to this class */
  protected override onInitialize() {
    this.connectedListener = (e: GamepadEvent) => {
      console.log('Gamepad connected:', e.gamepad.id);
      this.updateGamepads();
    };
    
    this.disconnectedListener = (e: GamepadEvent) => {
      console.log('Gamepad disconnected:', e.gamepad.id);
      this.updateGamepads();
    };

    window.addEventListener('gamepadconnected', this.connectedListener);
    window.addEventListener('gamepaddisconnected', this.disconnectedListener);

    // Start polling gamepads
    this.startPolling();
  }

  /** Poll gamepad state using requestAnimationFrame */
  private startPolling() {
    const pollGamepads = () => {
      this.updateGamepads();
      this.checkGamepadState();
      this.animationFrameId = requestAnimationFrame(pollGamepads);
    };
    
    this.animationFrameId = requestAnimationFrame(pollGamepads);
  }

  /** Update the list of connected gamepads */
  private updateGamepads() {
    this.gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    
    // Initialize previous states arrays
    for (let i = 0; i < this.gamepads.length; i++) {
      const gamepad = this.gamepads[i];
      if (gamepad) {
        if (!this.previousButtons[i]) {
          this.previousButtons[i] = new Array(gamepad.buttons.length).fill(false);
        }
        if (!this.previousAxes[i]) {
          this.previousAxes[i] = new Array(gamepad.axes.length).fill(0);
        }
      }
    }
  }

  /** Check for button and axis changes */
  private checkGamepadState() {
    for (let gamepadIndex = 0; gamepadIndex < this.gamepads.length; gamepadIndex++) {
      const gamepad = this.gamepads[gamepadIndex];
      if (!gamepad) continue;

      // Check buttons
      for (let buttonIndex = 0; buttonIndex < gamepad.buttons.length; buttonIndex++) {
        const button = gamepad.buttons[buttonIndex];
        const pressed = button.pressed;
        const wasPressed = this.previousButtons[gamepadIndex][buttonIndex];
        
        if (pressed !== wasPressed) {
          const buttonName = this.getButtonName(buttonIndex);
          console.log('changing press state!', buttonName);
          this.out(
            InputType.Button,
            buttonName,
            pressed ? ButtonState.PRESSED : ButtonState.UNPRESSED,
          );
          this.previousButtons[gamepadIndex][buttonIndex] = pressed;
        }
      }

      // Check axes (sticks and triggers)
      const stickDeadzone = 0.1;
      
      // Left stick (axes 0, 1)
      const leftX = gamepad.axes[0];
      const leftY = gamepad.axes[1];
      // const prevLeftX = this.previousAxes[gamepadIndex][0] || 0;
      // const prevLeftY = this.previousAxes[gamepadIndex][1] || 0;

      {
        const leftStickX = Math.abs(leftX) > stickDeadzone ? leftX : 0;
        const leftStickY = Math.abs(leftY) > stickDeadzone ? leftY : 0;
        
        this.out(
          InputType.Direction,
          leftStickX,
          leftStickY,
          'leftStick'
        );
        console.log(leftStickX, -leftStickY);
      }
      
      this.previousAxes[gamepadIndex][0] = leftX;
      this.previousAxes[gamepadIndex][1] = leftY;

      // Right stick (axes 2, 3)
      const rightX = gamepad.axes[2];
      const rightY = gamepad.axes[3];
      const prevRightX = this.previousAxes[gamepadIndex][2] || 0;
      const prevRightY = this.previousAxes[gamepadIndex][3] || 0;
      
      if (Math.abs(rightX - prevRightX) > stickDeadzone || 
          Math.abs(rightY - prevRightY) > stickDeadzone) {
        // Apply deadzone
        const rightStickX = Math.abs(rightX) > stickDeadzone ? rightX : 0;
        const rightStickY = Math.abs(rightY) > stickDeadzone ? rightY : 0;
        
        this.out(
          InputType.Direction,
          rightStickX,
          rightStickY,
          'rightStick',
        );
      }
      
      this.previousAxes[gamepadIndex][2] = rightX;
      this.previousAxes[gamepadIndex][3] = rightY;
    }
  }

  /** Map gamepad button index to standard button name */
  private getButtonName(index: number): string {
    const buttonNames = [
      PGamepadButton.A,           // 0
      PGamepadButton.B,           // 1
      PGamepadButton.X,           // 2
      PGamepadButton.Y,           // 3
      PGamepadButton.LB,          // 4
      PGamepadButton.RB,          // 5
      PGamepadButton.LT,          // 6 - Note: LT/RT might be axes in some browsers
      PGamepadButton.RT,          // 7
      PGamepadButton.BACK,        // 8
      PGamepadButton.START,       // 9
      PGamepadButton.LEFT_STICK,  // 10
      PGamepadButton.RIGHT_STICK, // 11
      PGamepadButton.DPAD_UP,     // 12
      PGamepadButton.DPAD_DOWN,   // 13
      PGamepadButton.DPAD_LEFT,   // 14
      PGamepadButton.DPAD_RIGHT,  // 15
    ];
    
    return buttonNames[index] || `Button${index}`;
  }

  /** Called when this input type is no longer needed */
  protected override onDestroy() {
    console.log('gamepad destroyed!');
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.connectedListener) {
      window.removeEventListener('gamepadconnected', this.connectedListener);
    }
    
    if (this.disconnectedListener) {
      window.removeEventListener('gamepaddisconnected', this.disconnectedListener);
    }
    
    this.connectedListener = undefined;
    this.disconnectedListener = undefined;
    this.gamepads = [];
    this.previousButtons = [];
    this.previousAxes = [];
  }
}

export const PGamepad = new PGamepadInput();
(window as any).PGamepad = PGamepad;
