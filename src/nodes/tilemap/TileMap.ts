import { Peek } from '../../peek';
import { Texture } from '../../resources/Texture';
import { TileSet } from '../../resources/TileSet';
import { PNode } from '../PNode';

interface SingleChunk {
  cx: number, cy: number,
  data: number[],
  texture: Texture,
}

/**
 * An arrangement of tiles placed in a grid
 */
export class TileMap extends PNode {
  public static readonly BITS_PER_CHUNK = 5;
  public static readonly TILES_PER_CHUNK = 1 << this.BITS_PER_CHUNK;
  public static readonly CHUNK_BITMASK = this.TILES_PER_CHUNK - 1;

  private chunks = new Map<number, SingleChunk>();

  /** Constructs a tilemap */
  public constructor(
    public tileSet: TileSet
  ) {
    super();
  }

  /** Gets a chunk ID from a given tile position */
  private static chunkIDFromTile(x: number, y: number): number {
    return (
      ((x >> TileMap.BITS_PER_CHUNK) + (1 << 13)) << 14 |
      ((y >> TileMap.BITS_PER_CHUNK) + (1 << 13))
    );
  }

  /** Gets the data index of a tile (doesn't have to be normalized) */
  private static chunkIndexFromTile(x: number, y: number): number {
    return (
      (y & TileMap.CHUNK_BITMASK) << TileMap.BITS_PER_CHUNK |
      (x & TileMap.CHUNK_BITMASK)
    );
  }

  /**
   * Redraws the whole tilemap.
   * Doesn't create new textures, just re-draws on existing ones.
   */
  public redraw() {
    for (const [ , chunk ] of this.chunks) {
      chunk.texture.clear();
      for (let i = 0; i < chunk.data.length; i++) {
        const ix = i % TileMap.TILES_PER_CHUNK;
        const iy = ~~(i / TileMap.TILES_PER_CHUNK);
        this.updateTile(chunk, ix, iy, i);
      }
    }
  }

  /** Sets a tile at a given position */
  public setTile(tile: number, x: number, y: number, update = true) {
    const id = TileMap.chunkIDFromTile(x, y);
    const idx = TileMap.chunkIndexFromTile(x, y);
    let chunk = this.chunks.get(id);
    if (!chunk) {
      chunk = {
        cx: x >> TileMap.BITS_PER_CHUNK, cy: y >> TileMap.BITS_PER_CHUNK,
        data: new Array(TileMap.TILES_PER_CHUNK * TileMap.TILES_PER_CHUNK),
        texture: new Texture(
          TileMap.TILES_PER_CHUNK * this.tileSet.tileWidth,
          TileMap.TILES_PER_CHUNK * this.tileSet.tileHeight,
        )
      };
      console.log('made chunk:', chunk.cx, chunk.cy);
      chunk.texture.clear();
      this.chunks.set(id, chunk);
    }
    chunk.data[idx] = tile;

    if (update) this.updateTile(
      chunk,
      x & TileMap.CHUNK_BITMASK, y & TileMap.CHUNK_BITMASK,
      idx
    );
  }

  /** Updates a single tile. */
  private updateTile(chunk: SingleChunk, ix: number, iy: number, idx: number) {
    chunk.texture.clearRect(
      ix * this.tileSet.tileWidth,
      iy * this.tileSet.tileHeight,
      this.tileSet.tileWidth,
      this.tileSet.tileHeight,
    );
    this.tileSet.drawTile(
      chunk.data[idx],
      ix * this.tileSet.tileWidth,
      iy * this.tileSet.tileHeight,
      chunk.texture
    );
  }


  /** Draws the tilemap */
  protected override draw(): void {
    for (const [ , chunk ] of this.chunks) {
      chunk.texture.draw(
        chunk.cx * TileMap.TILES_PER_CHUNK * this.tileSet.tileWidth,
        chunk.cy * TileMap.TILES_PER_CHUNK * this.tileSet.tileHeight
      );
    }
  }

}
