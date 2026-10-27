// @vitest-environment node
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserBudget } from '../../server/browser-budget';
import { DEFAULT_BUDGET, responseBytes } from '../../server/budget-policy';

/** Real SQLite queries/transactions; provider calls and Worker context are mocked. */
describe('shared Browser Run accounting', () => {
  let db: DatabaseSync;
  let budget: BrowserBudget;
  let setAlarm: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    const storage = {
      sql: {
        exec(query: string, ...args: any[]) {
          if (query.includes('CREATE TABLE')) {
            db.exec(query);
            return;
          }
          const rows = db.prepare(query).all(...args);
          return { toArray: () => rows, one: () => rows[0] };
        },
      },
      transactionSync(callback: () => unknown) {
        db.exec('BEGIN');
        try {
          const value = callback();
          db.exec('COMMIT');
          return value;
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
      },
      setAlarm: (setAlarm = vi.fn(async () => {})),
    };
    budget = new BrowserBudget(
      { storage } as any,
      {
        PUBLIC_DEMO_BUDGET: JSON.stringify(DEFAULT_BUDGET),
        CF_ACCOUNT_ID: 'mock-account',
        CF_API_TOKEN: 'mock-token',
      } as any,
    );
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    db.close();
    vi.unstubAllGlobals();
  });

  it('serializes admission and never refunds charged daily work', () => {
    const first = budget.reserve('quick', 50);
    budget.reserve('crawl', 50);
    expect(() => budget.reserve('quick', 1)).toThrow('allowance exhausted');
    budget.complete(first);
    expect(() => budget.reserve('quick', 1)).toThrow('allowance exhausted');
  });

  it('does not expire ambiguous capacity on the next UTC day', () => {
    budget.reserve('quick', 1);
    budget.reserve('binding', 1);
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 86_400_000);
    expect(() => budget.reserve('quick', 1)).toThrow('allowance exhausted');
    vi.restoreAllMocks();
  });

  it('keeps cancellation capacity until a provider terminal status is observed', async () => {
    const id = budget.reserve('crawl', 5);
    await budget.attach(id, 'known-job');
    db.prepare('UPDATE reservations SET deadline = 0 WHERE id = ?').run(id);
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockResolvedValueOnce(
        Response.json({ success: true, result: { status: 'running' } }),
      );
    await budget.alarm();
    expect(
      db.prepare('SELECT state FROM reservations WHERE id = ?').get(id),
    ).toMatchObject({ state: 'running' });
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockResolvedValueOnce(
        Response.json({
          success: true,
          result: { status: 'cancelled_by_user' },
        }),
      );
    await budget.alarm();
    expect(
      db.prepare('SELECT state, work FROM reservations WHERE id = ?').get(id),
    ).toMatchObject({ state: 'complete', work: 5 });
  });

  it('cannot resurrect capacity completed by a concurrent status confirmation', async () => {
    const id = budget.reserve('crawl', 5);
    await budget.attach(id, 'known-job');
    vi.mocked(fetch).mockImplementation(async () => {
      budget.terminal('known-job', 'completed');
      return Response.json({ success: true, result: { status: 'running' } });
    });
    await budget.alarm();
    expect(
      db.prepare('SELECT state FROM reservations WHERE id = ?').get(id),
    ).toMatchObject({ state: 'complete' });
  });

  it('keeps observing a fifteen-minute crawl past ten healthy polls and cancels at its deadline', async () => {
    const now = Date.now();
    const id = budget.reserve('crawl', 5);
    await budget.attach(id, 'long-job');
    db.prepare('UPDATE reservations SET deadline = ? WHERE id = ?').run(
      now + 900_000,
      id,
    );
    vi.mocked(fetch).mockImplementation(async (_url, init) =>
      Response.json({
        success: true,
        result: {
          status: init?.method === 'DELETE' ? 'cancelled_by_user' : 'running',
        },
      }),
    );
    const clock = vi.spyOn(Date, 'now');
    for (let minute = 1; minute < 15; minute++) {
      clock.mockReturnValue(now + minute * 60_000);
      await budget.alarm();
    }
    expect(
      db
        .prepare('SELECT state, attempts FROM reservations WHERE id = ?')
        .get(id),
    ).toMatchObject({ state: 'running', attempts: 0 });
    clock.mockReturnValue(now + 900_000);
    await budget.alarm();
    expect(
      vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === 'DELETE'),
    ).toBe(true);
    clock.mockRestore();
  });

  it('retries after many failed cancellations and releases only on a recovered terminal observation', async () => {
    const id = budget.reserve('crawl', 5);
    await budget.attach(id, 'retry-job');
    db.prepare('UPDATE reservations SET deadline = 0 WHERE id = ?').run(id);
    vi.mocked(fetch).mockRejectedValue(new Error('Provider unavailable'));
    for (let attempt = 0; attempt < 12; attempt++) await budget.alarm();
    expect(
      db.prepare('SELECT state FROM reservations WHERE id = ?').get(id),
    ).toMatchObject({ state: 'running' });
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json({ success: true, result: { status: 'cancelled_by_user' } }),
    );
    await budget.alarm();
    expect(
      db.prepare('SELECT state FROM reservations WHERE id = ?').get(id),
    ).toMatchObject({ state: 'complete' });
  });

  it('caps failure backoff and new attachments at the nearest cancellation deadline', async () => {
    const now = Date.now();
    const first = budget.reserve('crawl', 5);
    await budget.attach(first, 'deadline-job');
    db.prepare(
      'UPDATE reservations SET deadline = ?, attempts = 5 WHERE id = ?',
    ).run(now + 5_000, first);
    vi.mocked(fetch).mockRejectedValue(new Error('Provider unavailable'));
    await budget.alarm();
    expect(setAlarm).toHaveBeenLastCalledWith(now + 5_000);
    const second = budget.reserve('crawl', 5);
    await budget.attach(second, 'new-job');
    expect(setAlarm).toHaveBeenLastCalledWith(now + 5_000);
  });

  it('bounds chunked responses without Content-Length', async () => {
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(5));
          controller.enqueue(new Uint8Array(5));
          controller.close();
        },
      }),
    );
    await expect(responseBytes(response, 8)).rejects.toThrow(
      'exceeds demo limits',
    );
  });
});
