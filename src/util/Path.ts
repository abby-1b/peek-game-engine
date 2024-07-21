
/** Utilities for resolving paths */
export class Path {
  /** Resolves a path (or URL) that contains ".." */
  public static resolve(path: string): string {
    let backSteps = 0;
    const isLink = path.startsWith('http://') || path.startsWith('https://');
    const outParts: string[] = [];

    const parts = path.split('/');
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part == '.') {
        // Same
      } else if (part == '..') {
        // Parent
        if (outParts.length == 0) {
          backSteps++;
        } else {
          outParts.pop();
        }
      } else if (part == '' && !(isLink && outParts.length <= 1)) {
        // Two slashes, ignore
      } else {
        // Normal path part, add it
        outParts.push(part);
      }
    }

    return '../'.repeat(backSteps) + outParts.join('/');
  }

  /**
   * Gets a path relative to a module's URL
   * @param moduleUrl Should always be `import.meta.url`
   * @param path The relative path you want to access
   * @returns The resolved path (without `..`)
   */
  public static relativeToModule(
    moduleUrl: string,
    path: string
  ): string {
    // The `..` is here because `import.meta.url` ends with the module name.
    return this.resolve(moduleUrl + '/../' + path);
  }
}
