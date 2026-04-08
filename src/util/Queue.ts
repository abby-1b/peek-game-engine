
/**
 * A double-ended queue (deque) with efficient O(1) amortized operations
 * using two arrays and a rotating index
 */
export class Queue<T> {
  private head: (T | undefined)[] = [];
  private tail: (T | undefined)[] = [];
  private index = 0;
  private headLength = 0;
  public length = 0;

  /** Get an item from the front of the queue */
  public shift(): T | undefined {
    if (this.index >= this.headLength) {
      // swap head and tail when head is empty
      const t = this.head;
      t.length = 0;
      this.head = this.tail;
      this.tail = t;
      this.index = 0;
      this.headLength = this.head.length;
      if (!this.headLength) {
        return;
      }
    }

    const value = this.head[this.index];
    // remove the item from the head
    if (this.index < 0) {
      delete this.head[this.index++];
    } else {
      this.head[this.index++] = undefined;
    }
    this.length--;
    return value;
  }

  /** Insert a new item at the front of the queue */
  public unshift(item: T): this {
    this.head[--this.index] = item;
    this.length++;
    return this;
  }

  /** Push a new item on the end of the queue */
  public push(item: T): this {
    this.length++;
    this.tail.push(item);
    return this;
  }

  /** Get the item at the front of the queue without removing it */
  public peek(): T | undefined {
    if (this.index < this.headLength) {
      return this.head[this.index];
    }
    return this.tail[0];
  }
}