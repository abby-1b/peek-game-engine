import { Module } from '../Module.ts';
import { Node2D } from '../resources/Node2D.ts';
import { FillRect } from '../resources/Node2D/FillRect.ts';
import { Scene } from '../resources/Node2D/Scene.ts';
import { Resource } from '../resources/Resource.ts';
import { Vec2 } from '../resources/vector.ts';

/** Loads scenes from a text file! */
export class SceneLoader extends Module {
  public static classNameMappings = (() => {
    const classNames: object[] = [
      Scene, FillRect,
      Node2D, Resource, Vec2,
    ];
    const ret: Record<string, object> = {};
    for (const cn of classNames) {
      ret[(cn as { name: string }).name] = cn;
    }
    return ret;
  })();

  /** Loads a scene given its path */
  public static load(path: string) {
    fetch(path)
      .then(res => res.text())
      .then(text => {
        this.loadString(text);
      });
  }

  /**  */
  private static loadString(str: string): Node2D {
    console.log(this.classNameMappings);
    const on: object[] = [];
    let lastDepth = 0;
    for (const l of str.split('\n')) {
      const line = l.trim();
      if (line.length == 0) continue; // Skip empty lines
      const depth = (l.length - line.length) / 2;
      if (depth == 0) {
        // Create the base object
        on.push(this.getNameClass(line));
        continue;
      }
      while (depth < on.length) on.pop();
      if (line.includes(':')) {
        this.setProperty(on[on.length - 1], line);
      }
      lastDepth = depth;
    }
    return new Node2D();
  }

  /**  */
  private static getNameClass(name: string) {
    return this.classNameMappings[name];
  }

  /**  */
  private static setProperty(obj: object, prop: string) {
    obj;
    prop;
  }
}
