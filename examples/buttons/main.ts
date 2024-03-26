import { Module } from '../../src/Module.ts';
import { Engine } from '../../src/peek';
import { DefaultModule } from '../../src/modules/DefaultModule.ts';
import { SceneManager } from '../../src/modules/SceneManager.ts';
import { Scene } from '../../src/resources/Node2D/Scene.ts';

/** The demo module */
class DemoButtons extends Module {
  public static scene = new Scene();
  
  /** Runs when the module is initiated */
  public static init() {
    super.init();

    // Make `this.frame()` run every frame
    // Frame.addFrameFunction(this.frame);

    this.scene.addChild(new Button());

    SceneManager.addScene(this.scene);

    return this;
  }

  /** Draws lines every frame */
  public static frame() {
    
  }
}

Engine
  .module(DefaultModule, '#cnv')
  .module(SceneManager)
  .module(DemoButtons);
