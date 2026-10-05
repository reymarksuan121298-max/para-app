/**
 * Extracts a message that is safe to show to the user from a caught value.
 *
 * Supabase throws both `Error` subclasses (auth, network) and plain objects
 * carrying a `message` property (PostgREST), so `instanceof Error` alone would
 * swallow real messages. Anything else — including values without a usable
 * string — falls back to `fallback`. Stack traces and other internals are
 * never returned.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const { message } = err;
    if (typeof message === 'string' && message.trim() !== '') {
      return message;
    }
  }
  return fallback;
}
