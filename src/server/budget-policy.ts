/** Public-demo allowances, not pricing estimates or Cloudflare platform limits. */
export const DEFAULT_BUDGET = {
  maxActive: 2,
  jobsPerDay: 30,
  workPerDay: 100,
  requestTimeoutMs: 20_000,
  crawlTimeoutMs: 300_000,
};
export type BudgetPolicy = typeof DEFAULT_BUDGET;

export function budgetPolicy(raw: unknown): BudgetPolicy {
  if (typeof raw !== 'string')
    throw new Error('Public demo budget configuration is required');
  let policy: BudgetPolicy;
  try {
    policy = JSON.parse(raw);
  } catch {
    throw new Error('Invalid public demo budget configuration');
  }
  if (
    !policy ||
    Object.keys(DEFAULT_BUDGET).some(
      (key) =>
        !Number.isSafeInteger(policy[key as keyof BudgetPolicy]) ||
        policy[key as keyof BudgetPolicy] <= 0,
    ) ||
    policy.requestTimeoutMs > 60_000 ||
    policy.crawlTimeoutMs > 900_000
  )
    throw new Error('Invalid public demo budget configuration');
  return policy;
}

export const TERMINAL_CRAWL = new Set([
  'completed',
  'errored',
  'cancelled_by_user',
  'cancelled_due_to_timeout',
  'cancelled_due_to_limits',
]);

/** Stream bounds apply even when providers omit Content-Length. */
export async function responseBytes(
  response: Response,
  maximum = 10 * 1024 * 1024,
): Promise<Uint8Array> {
  const length = Number(response.headers.get('content-length'));
  if (length > maximum)
    throw new Error('Provider response exceeds demo limits');
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maximum)
      throw new Error('Provider response exceeds demo limits');
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > maximum)
        throw new Error('Provider response exceeds demo limits');
      chunks.push(part.value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export async function providerJson<T>(response: Response): Promise<T> {
  // Body-less response doubles are used by the existing mocked-provider suite.
  if (!response.body) return response.json() as Promise<T>;
  return JSON.parse(
    new TextDecoder().decode(await responseBytes(response)),
  ) as T;
}

/** A deadline does not imply provider cancellation; callers must retain uncertain reservations. */
export async function deadline<T>(
  operation: Promise<T>,
  milliseconds: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                'Provider deadline exceeded; capacity remains reserved pending reconciliation',
              ),
            ),
          milliseconds,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
