/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SignalProperties {
  listeners?: Record<string, ((...args: any[]) => void)[]>
}

/** Handles event sending between objects */
export class Signal {
  /**
   * Sends a signal through a node. If the node has no registered
   * listeners for this signal, nothing happens.
   */
  public static send(
    reciever: object & SignalProperties,
    signalName: string,
    ...args: unknown[]
  ) {
    if (
      !reciever.listeners ||
      !(signalName in reciever.listeners)
    ) {
      // No listeners!
      return;
    }

    // Call the listeners
    for (const listener of reciever.listeners![signalName]) {
      listener(...args);
    }
  }

  /**
   * Attaches a listener to the given object
   * @param reciever The object to attach the listener to
   * @param signalName The name of the signal
   * @param fn The callback for when the signal is triggered
   */
  public static listen(
    reciever: object & SignalProperties,
    signalName: string,
    fn: (...args: any[]) => void
  ) {
    if (!reciever.listeners) {
      // Make sure the listeners have somewhere to be stored
      reciever.listeners = {};
    }

    if (signalName in reciever.listeners) {
      // Push this listener to the end of the existing array
      reciever.listeners![signalName].push(fn);
    } else {
      // No other listener for this signal, make the array
      reciever.listeners![signalName] = [ fn ];
    }
  }
}
