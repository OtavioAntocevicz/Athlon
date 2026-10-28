import { pool } from "../config/database.js";

/** Namespace fixo para locks de cron entre instâncias Railway. */
const LOCK_NAMESPACE = 0x4154484c;

export const CronJobLockId = {
  avisos: 1,
  diario: 2,
  mensal: 3,
} as const;

/**
 * Executa o job só se conseguir advisory lock no PostgreSQL.
 * Retorna null quando outra instância já está executando o mesmo job.
 */
export async function withCronAdvisoryLock<T>(
  jobId: number,
  fn: () => Promise<T>,
): Promise<T | null> {
  const client = await pool.connect();
  try {
    const acquired = await client.query<{ acquired: boolean }>(
      `SELECT pg_try_advisory_lock($1::int, $2::int) AS acquired`,
      [LOCK_NAMESPACE, jobId],
    );
    if (!acquired.rows[0]?.acquired) {
      console.log(`[cron] Job ${jobId} ignorado — lock em outra instância`);
      return null;
    }

    try {
      return await fn();
    } finally {
      await client.query(`SELECT pg_advisory_unlock($1::int, $2::int)`, [
        LOCK_NAMESPACE,
        jobId,
      ]);
    }
  } finally {
    client.release();
  }
}

export function runScheduledJob(name: string, fn: () => Promise<void>): void {
  void (async () => {
    try {
      await fn();
    } catch (err) {
      console.error(`[cron] Falha no job "${name}":`, err);
    }
  })();
}
