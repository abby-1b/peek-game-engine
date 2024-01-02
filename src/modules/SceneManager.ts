import { Module } from '../Module.ts';
import { Engine } from '../mod.ts';
import { Node2D } from '../resources/Node2D.ts';
import { Scene } from '../resources/Node2D/Scene.ts';
import { Frame } from './Frame.ts';
import { SceneLoader } from './SceneLoader.ts';

/**
 * The SceneManager is responsible for storing scenes and drawing them.
 */
export class SceneManager extends Module {
  public static scenes: Scene[] = [];
  public static activeScene: Scene | undefined;

  /** Initiates the module */
  public static init() {
    super.init();
    Engine.module(SceneLoader);
    Frame.addFrameFunction(this.frame, this);
    return this;
  }

  /**  */
  public static clear() {
    this.scenes = [];
    this.activeScene = undefined;
  }

  /** Adds a scene to the scene manager! */
  public static addScene(scene: Scene) {
    this.scenes.push(scene);

    // If there is no scene active, make this one the active scene
    if (!this.activeScene) { this.activeScene = scene; }
  }

  /** Runs every frame */
  public static frame(delta: number) {
    if (this.activeScene) {
      const camera = this.activeScene.camera;
      if (camera) camera.doTransform();
      this.frameSingle(this.activeScene, delta);
      Frame.transformPop();
    }
  }

  /** Draws a Node2D, then its children */
  private static frameSingle(node: Node2D, delta: number) {
    if (!node.visible) return;
    node.frame(delta);
    for (const c of (node as unknown as { children: Node2D[] }).children) {
      Frame.translate(~~(c.position.x), ~~(c.position.y));
      this.frameSingle(c, delta);
      Frame.transformPop();
    }
  }
}
