import { Camera } from './Camera';
import { PNode } from './PNode';

/**
 * Scenes are nodes that can preload their children. They also keep track of
 * their scene ID, which is a unique identifier assigned to each scene. Keep in 
 * mind that scene IDs are sequential, not assigned randomly.
 */
export class Scene extends PNode {
  private static currSceneID = 0;
  public readonly sceneID: number;

  public cameras: WeakRef<Camera>[] = [];

  /** Instantiates a scene */
  public constructor() {
    super();
    this.sceneID = Scene.currSceneID++;
  }

  /**
   * Gets this scene's active camera.
   * If no camera is found, this is `undefined`.
   */
  public getCamera(): Camera | undefined {
    let index = -1;
    for (const cameraRef of this.cameras) {
      index++;

      const camera = cameraRef.deref();
      if (!camera) {
        // Remove this camera from the list
        this.cameras.splice(index, 1);
        continue;
      }

      if (camera.isActive) {
        return camera;
      }
    }

    return undefined;
  }
}
