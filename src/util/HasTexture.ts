import { Texture } from '../resources/Texture';

/** An interface for things whose texture can be configured */
export interface HasTexture {
  setTexture(texture: Texture): this;
}
