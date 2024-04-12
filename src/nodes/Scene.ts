import { PNode } from './PNode';

/**
 * Scenes are nodes that can preload their children. They also keep track of
 * their scene ID, which is a unique identifier assigned to each scene. Keep in 
 * mind that scene IDs are sequential, however.
 */
export class Scene extends PNode {
  private static currSceneID = 0;

  public readonly sceneID: number;

  /** Builds a scene */
  public constructor() {
    super();
    this.sceneID = Scene.currSceneID++;
  }
}
