# Style Guide

## Comments

- Lists with bullet points shouldn't use periods unless there are multiple sentences within a bullet point
- Avoid the use of semicolons `;` or em-dashes `-` to transition between clauses, opting for a simple comma `,`
- Comments that aren't a full sentence should NEVER end with a period `.`
- No line should exceed 80 columns
- Avoid the use of long chains of `-` or `=` separating sections of code. Likewise, avoid large headers. If a header is absolutely necessary, use the format `// --- HEADER ---` without long chains.
- Don't use `@returns` or `@param` in JSDoc unless the function is very very complicated

## Code spacing

- ALWAYS Use double-spaced indentation
- When there are multiple lines of code, NEVER use extra spacing to align them

## Classes
- Class properties and methods should ALWAYS, ALWAYS have a visibility modifier `public`, `private`, or `protected`. This includes the constructor, methods, and properties!
- If a private property has a simple getter and setter, simply make the property public. The combination of getter AND setter is only allowed if complex (performs some action OTHER than simply setting `_property = value;`).
- A class property or method is only allowed to start with an underscore `_` if the property/method is an INTERNAL value that has been exposed to another system, class, or method of the project
- If a property is only used within the class and not outside of it (e.g. a simple getter with no setter, both pointing to a `_property`), name the property `innerProperty` instead of starting with an underscore `_`. This makes the purpose of the underscore explicit.
- If an instance method doesn't use any `this.` properties, it should probably be made static
