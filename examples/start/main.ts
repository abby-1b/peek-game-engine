/* eslint-disable @typescript-eslint/no-explicit-any */

// Modules
declare const Peek: any;
declare const Gen: any;

// Nodes
declare const Scene: any;
declare const Character: any;
declare const Box: any;
declare const Particles: any;

// Resources
declare const Vec: any;
declare const Rect: any;

Peek.screenSize(128, 128);

Scene.bgColor(10, 12, 18);
Scene.add(
  new Character(Gen.img(8, 8)),
  new Box(new Rect(0, 100, 128, 28), true),
  new Particles(new Rect(0, -1, 128, 1))
);

Peek.start();
