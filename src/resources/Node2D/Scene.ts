import { Node2D } from '../Node2D.ts';
import { Camera } from './Camera.ts';

/** Takes care of loading/unloading its children! */
export class Scene extends Node2D {
  public camera: Camera | undefined;

  /**
   * Sets the active camera for this scene. If the camera is already in the
   * scene, this simply sets it as active. If the camera is not in the scene,
   * it gets added before being set as active.
   */
  public setCamera(camera: Camera) {
    if (!this.children.includes(camera)) {
      this.children.push(camera);
    }
    this.camera = camera;
  }
}
