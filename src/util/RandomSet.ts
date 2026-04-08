import { Gen } from '../resources/Gen.ts';

/**
 * A randomly-indexable HashSet.
 *
 * Keeps an array in memory!
 * Insertion is O(1) avg. + O(1) avg.,
 * Deletion is O(1) avg. + O(N/2) avg.,
 * Random access is O(1) always.
 */
export class RandomSet<T> {
  /** Internal set used for fast membership checks */
  private readonly set: Set<T> = new Set();

  /** Backing array used for O(1) random access */
  private readonly arr: T[] = [];

  /** Returns an iterator over the set's items */
  public all(): Iterable<T> {
    return this.arr;
  }

  /** Adds a value if it does not already exist */
  public add(value: T): void {
    if (this.set.has(value)) return;
    this.set.add(value);
    this.arr.push(value);
  }

  /** Removes a value if present */
  public delete(value: T): void {
    if (!this.set.delete(value)) return;

    const i = this.arr.indexOf(value);
    if (i !== -1) {
      this.arr[i] = this.arr[this.arr.length - 1];
      this.arr.pop();
    }
  }

  /** Returns a uniformly random element, or undefined if empty */
  public random(): T | undefined {
    if (this.arr.length === 0) return undefined;
    return this.arr[(Math.random() * this.arr.length) | 0];
  }

  /** Returns the number of stored elements */
  public get size(): number {
    return this.arr.length;
  }

  /** Clears all stored elements */
  public clear(): void {
    this.set.clear();
    this.arr.length = 0;
  }

  /** Returns true if the value exists */
  public has(value: T): boolean {
    return this.set.has(value);
  }
}
