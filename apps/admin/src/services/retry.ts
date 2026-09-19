/**
 * Retries a transient-prone async operation a few times with a short,
 * increasing delay — built after tracing a real failure where a single
 * day out of dozens silently dropped its image mid-way through a long,
 * sequential PDF import: one request in a long chain hit what looked like
 * a one-off network blip, while everything immediately before and after
 * it succeeded fine.
 *
 * `isRetryable` decides whether a given result is worth retrying at all —
 * a genuine validation error (e.g. a duplicate-date conflict) should fail
 * immediately, not retry a few times for nothing.
 */
export async function retryAsync<T>(
  fn: () => PromiseLike<T>,
  isRetryable: (result: T) => boolean,
  maxAttempts = 3,
  baseDelayMs = 500
): Promise<T> {
  let result: T;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    result = await fn();
    if (!isRetryable(result) || attempt === maxAttempts) return result;
    await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
  }
  return result!;
}
