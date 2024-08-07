
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SignalFunction = (...args: any[]) => void;

export type InnerSignalProperties = Record<string, SignalFunction[]>;
export interface SignalProperties {
  listeners?: InnerSignalProperties
}

/** Handles event sending between objects */
export class Signal {
  private static virtualObjects: Record<string, InnerSignalProperties> = {};

  /**
   * Sends a signal through a node. If the node has no registered
   * listeners for this signal, nothing happens.
   * @param reciever The object to send the signal through to
   * @param signalName The name of the signal
   */
  public static send(
    reciever: object & SignalProperties,
    signalName: string,
    ...args: unknown[]
  ) {
    const listeners = reciever.listeners?.[signalName];
    if (listeners) {
      // Call the listeners
      for (const listener of listeners) {
        listener(...args);
      }
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
    fn: SignalFunction
  ) {
    if (!reciever.listeners) {
      // Make sure the listeners have somewhere to be stored
      reciever.listeners = {};
    }

    if (signalName in reciever.listeners) {
      // Push this listener to the end of the existing array
      reciever.listeners[signalName].push(fn);
    } else {
      // No other listener for this signal, make the array
      reciever.listeners[signalName] = [ fn ];
    }
  }


  /**
   * Sends a signal to a virtual object (an object which does not exist).
   * @param name The name of the virtual object
   * @param signalName The name of the signal to send
   */
  public static sendVirtual(
    name: string,
    signalName: string,
    ...args: unknown[]
  ) {
    const listeners = this.virtualObjects[name]?.[signalName];
    if (listeners) {
      // Call the listeners
      for (const listener of listeners) {
        listener(...args);
      }
    }

  }


  /**
   * Attaches a listener to the given object
   * @param name The name of the virtual object
   * @param signalName The name of the signal
   * @param fn The callback for when the signal is triggered
   */
  public static listenVirtual(
    name: string,
    signalName: string,
    fn: SignalFunction
  ) {
    if (!(name in this.virtualObjects)) {
      this.virtualObjects[name] = {};
    }

    const listeners = this.virtualObjects[name];
    if (signalName in listeners) {
      listeners[signalName].push(fn);
    } else {
      listeners[signalName] = [ fn ];
    }
  }
}
