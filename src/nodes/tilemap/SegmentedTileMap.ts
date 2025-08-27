import { TileSet } from '../../resources/TileSet';
import { TileMap } from './TileMap';

/**
 * A tilemap that is divided into multiple sections.
 * 
 * This is useful for very large tilemaps that aren't shown all at once.
 * Although draw calls can go up using this method, large worlds may benefit
 * from not having all their tiles loaded (and drawn!) at once.
 */
export class SegmentedTileMap extends TileMap {
  /** Constructs a segmented tilemap */
  public constructor(
    public segmentWidth: number,
    tileSet: TileSet
  ) {
    super(tileSet);
  }

  // TODO: implement segmented tilemaps
}
