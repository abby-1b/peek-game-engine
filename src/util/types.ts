/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  interface Window {
    Peek: any,
    Debugger: any,
    TextureAtlas: any
  }
}

export type AnyConstructorFor<T> = new (...args: any[]) => T;
