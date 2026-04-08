/** */
export class Signal<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends any[],
> {
  public subscribers: ((...args: T) => void)[] = [];

  /** */
  public constructor() {}

  /** Calls the given function when this signal is activated */
  public connect(subscriber: (...args: T) => void): void {
    this.subscribers.push(subscriber);
  }

  /** Sends this signal to all its subscribers */
  public activate(...args: T) {
    for (const s of this.subscribers) s(...args);
  }
}
