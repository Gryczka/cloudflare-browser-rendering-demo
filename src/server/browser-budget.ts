import { DurableObject } from 'cloudflare:workers';
import {
  budgetPolicy,
  deadline,
  providerJson,
  TERMINAL_CRAWL,
} from './budget-policy';

interface Reservation {
  [key: string]: SqlStorageValue;
  id: string;
  job_id: string | null;
  deadline: number;
  attempts: number;
}

/** One deployment-wide coordination atom. Never expires capacity on elapsed time alone. */
type BudgetEnv = Env & { CF_ACCOUNT_ID?: string; CF_API_TOKEN?: string };
export class BrowserBudget extends DurableObject<BudgetEnv> {
  constructor(ctx: DurableObjectState, env: BudgetEnv) {
    super(ctx, env);
    ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL, work INTEGER NOT NULL,
      created INTEGER NOT NULL, state TEXT NOT NULL, job_id TEXT UNIQUE,
      deadline INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0
    ); CREATE INDEX IF NOT EXISTS reservation_created ON reservations(created);`);
  }

  reserve(kind: 'quick' | 'crawl' | 'binding', work: number): string {
    const policy = budgetPolicy(this.env.PUBLIC_DEMO_BUDGET);
    if (
      !['quick', 'crawl', 'binding'].includes(kind) ||
      !Number.isSafeInteger(work) ||
      work < 1
    )
      throw new Error('Invalid reservation');
    const now = Date.now();
    const today = Math.floor(now / 86_400_000) * 86_400_000;
    return this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec(
        "DELETE FROM reservations WHERE state = 'complete' AND created < ?",
        today - 86_400_000,
      );
      const active = this.ctx.storage.sql
        .exec<{ [key: string]: SqlStorageValue; n: number }>(
          "SELECT COUNT(*) AS n FROM reservations WHERE state != 'complete'",
        )
        .one().n;
      const spent = this.ctx.storage.sql
        .exec<{ [key: string]: SqlStorageValue; jobs: number; work: number }>(
          'SELECT COUNT(*) AS jobs, COALESCE(SUM(work), 0) AS work FROM reservations WHERE created >= ?',
          today,
        )
        .one();
      if (
        active >= policy.maxActive ||
        spent.jobs >= policy.jobsPerDay ||
        spent.work + work > policy.workPerDay
      )
        throw new Error('Shared public demo allowance exhausted');
      const id = crypto.randomUUID();
      this.ctx.storage.sql.exec(
        'INSERT INTO reservations(id, kind, work, created, state, deadline) VALUES (?, ?, ?, ?, ?, ?)',
        id,
        kind,
        work,
        now,
        'reserved',
        now + policy.crawlTimeoutMs,
      );
      return id;
    });
  }

  complete(id: string): void {
    this.ctx.storage.sql.exec(
      "UPDATE reservations SET state = 'complete' WHERE id = ?",
      id,
    );
    // Daily jobs/work are never refunded, including errors or cancellation.
  }

  async attach(id: string, jobId: string): Promise<void> {
    if (typeof jobId !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(jobId))
      throw new Error('Invalid provider job ID');
    const changed = this.ctx.storage.sql
      .exec(
        "UPDATE reservations SET job_id = ?, state = 'running' WHERE id = ? AND kind = 'crawl' AND state = 'reserved' RETURNING id",
        jobId,
        id,
      )
      .toArray();
    if (changed.length !== 1) throw new Error('Unknown crawl reservation');
    const now = Date.now();
    const jobs = this.ctx.storage.sql
      .exec<Reservation>(
        "SELECT id, job_id, deadline, attempts FROM reservations WHERE state = 'running'",
      )
      .toArray();
    await this.ctx.storage.setAlarm(
      Math.max(
        now + 1,
        Math.min(now + 60_000, ...jobs.map((job) => job.deadline)),
      ),
    );
  }

  known(jobId: string): boolean {
    return (
      this.ctx.storage.sql
        .exec('SELECT 1 FROM reservations WHERE job_id = ?', jobId)
        .toArray().length === 1
    );
  }

  terminal(jobId: string, status: string): void {
    if (TERMINAL_CRAWL.has(status))
      this.ctx.storage.sql.exec(
        "UPDATE reservations SET state = 'complete' WHERE job_id = ?",
        jobId,
      );
  }

  async alarm(): Promise<void> {
    const policy = budgetPolicy(this.env.PUBLIC_DEMO_BUDGET);
    const jobs = this.ctx.storage.sql
      .exec<Reservation>(
        "SELECT id, job_id, deadline, attempts FROM reservations WHERE state = 'running'",
      )
      .toArray();
    for (const job of jobs) {
      let failed = false;
      try {
        if (!this.env.CF_ACCOUNT_ID || !this.env.CF_API_TOKEN)
          throw new Error('Provider configuration unavailable');
        const url = `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/browser-rendering/crawl/${encodeURIComponent(job.job_id!)}`;
        const init = {
          headers: { Authorization: `Bearer ${this.env.CF_API_TOKEN}` },
          signal: AbortSignal.timeout(policy.requestTimeoutMs),
        };
        if (job.deadline <= Date.now()) {
          try {
            const cancellation = await deadline(
              fetch(url, { ...init, method: 'DELETE' }),
              policy.requestTimeoutMs,
            );
            failed = !cancellation.ok;
            void cancellation.body?.cancel().catch(() => {});
          } catch {
            failed = true;
          }
        }
        const response = await deadline(
          fetch(`${url}?limit=1`, {
            ...init,
            signal: AbortSignal.timeout(policy.requestTimeoutMs),
          }),
          policy.requestTimeoutMs,
        );
        if (response.ok) {
          const body = await deadline(
            providerJson<{ success: boolean; result: { status: string } }>(
              response,
            ),
            policy.requestTimeoutMs,
          );
          if (body.success && TERMINAL_CRAWL.has(body.result?.status)) {
            this.complete(job.id);
            continue;
          }
          if (!body.success || typeof body.result?.status !== 'string')
            failed = true;
        } else {
          failed = true;
          void response.body?.cancel().catch(() => {});
        }
      } catch {
        /* A timeout or failed cancellation is not proof of termination. */
        failed = true;
      }
      this.ctx.storage.sql.exec(
        "UPDATE reservations SET attempts = ? WHERE id = ? AND state = 'running'",
        failed ? Math.min(job.attempts + 1, 5) : 0,
        job.id,
      );
    }
    if (
      this.ctx.storage.sql
        .exec("SELECT 1 FROM reservations WHERE state = 'running' LIMIT 1")
        .toArray().length
    ) {
      const remaining = this.ctx.storage.sql
        .exec<Reservation>(
          "SELECT id, job_id, deadline, attempts FROM reservations WHERE state = 'running'",
        )
        .toArray();
      const now = Date.now();
      await this.ctx.storage.setAlarm(
        Math.min(
          ...remaining.map((job) =>
            Math.min(
              now + Math.min(60_000 * 2 ** job.attempts, 300_000),
              job.deadline > now ? job.deadline : Infinity,
            ),
          ),
        ),
      );
    }
  }
}
