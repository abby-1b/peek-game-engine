/**
 * Prints an error message
 * @param message The error message to be printed out
 * @param docs The docstring to be printed out.
 */
export function error(message: string, docs?: string) {
  console.log(`%c${message}${docs ? '\n' + docs : ''}`, 'color: red');
}

/**
 * Prints a warning to the console
 * @param message 
 */
export function warn(message: string) {
  console.warn(message);
}
