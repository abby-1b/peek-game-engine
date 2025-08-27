/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  interface Window {
    Peek: any,
    Physics: any,
    Debugger: any,
    TextureAtlas: any,
    Color: any,
  }
}

export type AnyConstructorFor<T> = new (...args: any[]) => T;
