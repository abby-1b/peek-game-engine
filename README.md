
# Peek Game Engine

Peek is built with simplicity in mind. It uses a node system similar to Godot,
but keeps things easy to modify from a code editor, rather than a GUI.

# Why Peek?

The name "Peek" emphasises the main feature of the engine: being able to peek at
anything inside the engine. Since you write code in the same language that the
engine is written, you can see how the engine's internals work!

More literally, when you're building the game, you're able to enter debug mode,
which lets you to peek into the game's nodes, their properties and some aspects
of their code.

# "Isn't this just _another_ game engine?"

Most popular game engines are tailored for large projects. Because of this, I've
found that they're overkill for the small projects I work on.

Take Godot, for example. Even with its nicely balanced set of features, it
churns out huge exports even for small games (why is my Space Invaders clone 9MB
for a web build?)

The goal of Peek is to have an extremely lightweight custom engine that can be
used to create small games quickly; it's by no means meant for graphically
and/or computationally demanding games.

That being said, it can be used to build _large_ games. With some clever
programming, it shouldn't be a stretch to create large worlds, complex game
mechanics, or practically anything that a retro game console is capable of.
