
// INTERPOLATION

/**
 * Linearly interpolates between two numbers.
 * Uses the following formula: `a * (1 - i) + b * i`
 * @param a Start value
 * @param b End value
 * @param i Interpolate amount [0, 1]
 */
export function lerp(a: number, b: number, i: number) {
  return a * (1 - i) + b * i;
}

/**
 * Quadratically (x ** 2) interpolates between two numbers.
 * @param a Start value
 * @param b End value
 * @param i Interpolate amount [0, 1]
 */
export function qerp(a: number, b: number, i: number) {
  i = i < 0.5
    ? 2 * i * i
    : 1 - 2 * ((i - 1) ** 2);
  return a * (1 - i) + b * i;
}

/**
 * Interpolates between two using a given a power (x ** n).
 * @param a Start value
 * @param b End value
 * @param i Interpolate amount [0, 1]
 * @param n The power of easing to use
 */
export function nerp(a: number, b: number, i: number, n: number) {
  i = i < 0.5
    ? (i ** n) * (2 ** (n - 1))
    : 1 - (2 ** (n -1)) * ((1 - i) ** n);
  return a * (1 - i) + b * i;
}

// RANOMNESS

/**
 * Generates a random number in a specified range
 * @param start The start of the range
 * @param end The end of the range
 */
export function randomRange(start: number, end: number) {
  return Math.random() * (end - start) + start;
}
