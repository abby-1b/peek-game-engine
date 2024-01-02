import { Module } from '../Module.ts';
import { Engine } from '../mod.ts';
import { Frame } from './Frame.ts';
import { SceneManager } from './SceneManager.ts';

/**
 * The default module for the engine. It runs some base code that NEEDS to be in
 * place to make everything work. This is done over having everything be inside
 * the engine class to enforce modularity, as everything that can be done by
 * THIS module should be doable by any other.
 */
export class DefaultModule extends Module {
  /**
   * Initiates the module
   * @param canvas The canvas we'll be using for drawing. If a string is passed,
   * we assume it's the CSS path to the canvas.
   */
  public static init(canvas: string | HTMLCanvasElement) {
    super.init();
    Engine.module(Frame, canvas);
    Engine.module(SceneManager);
    return this;
  }
}
