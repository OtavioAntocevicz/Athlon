import { AsyncLocalStorage } from "node:async_hooks";
import type { DatabaseError, PoolClient } from "pg";
import { nanoid } from "nanoid";
import { pool } from "../config/database.js";
import { AppError } from "../middleware/error-handler.js";

const tx = new AsyncLocalStorage<PoolClient>();

function db() {
  return tx.getStore() ?? pool;
}

export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await tx.run(client, fn);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    if (err instanceof AppError) throw err;
    handleDbError(err);
  } finally {
    client.release();
  }
}

export function generateId(): string {
  return nanoid();
}

export function now(): string {
  return new Date().toISOString();
}

function isPgError(err: unknown): err is DatabaseError {
  return typeof err === "object" && err !== null && "code" in err;
}

export function handleDbError(err: unknown, notFound?: { code?: string; message: string }): never {
  if (isPgError(err)) {
    if (err.code === "23505") {
      throw new AppError(409, "CONFLICT", "Registro já existe");
    }
    if (err.code === "23503") {
      throw new AppError(400, "FK_VIOLATION", "Referência inválida");
    }
  }
  if (notFound) {
    throw new AppError(404, notFound.code ?? "NOT_FOUND", notFound.message);
  }
  const message = err instanceof Error ? err.message : "Erro no banco de dados";
  throw new AppError(500, "DB_ERROR", message);
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  try {
    const result = await db().query(text, params);
    return result.rows as T[];
  } catch (err) {
    handleDbError(err);
  }
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
  notFound?: { code?: string; message: string },
): Promise<T> {
  const rows = await query<T>(text, params);
  if (rows.length === 0) {
    if (notFound) {
      throw new AppError(404, notFound.code ?? "NOT_FOUND", notFound.message);
    }
    throw new AppError(404, "NOT_FOUND", "Registro não encontrado");
  }
  return rows[0];
}

export async function queryMaybeOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function execute(text: string, params: unknown[] = []): Promise<number> {
  try {
    const result = await db().query(text, params);
    return result.rowCount ?? 0;
  } catch (err) {
    handleDbError(err);
  }
}

export async function countQuery(text: string, params: unknown[] = []): Promise<number> {
  const row = await queryOne<{ count: string }>(text, params);
  return parseInt(row.count, 10);
}

/** @deprecated Use query/queryOne diretamente. Mantido temporariamente para compatibilidade. */
export function throwOnError<T>(
  result: { data: T | null; error: { code?: string; message: string } | null },
  notFound?: { code?: string; message: string },
): T {
  if (result.error) {
    if (result.error.code === "23505") {
      throw new AppError(409, "CONFLICT", "Registro já existe");
    }
    if (result.error.code === "PGRST116" && notFound) {
      throw new AppError(404, notFound.code ?? "NOT_FOUND", notFound.message);
    }
    throw new AppError(500, "DB_ERROR", result.error.message);
  }
  if (result.data === null && notFound) {
    throw new AppError(404, notFound.code ?? "NOT_FOUND", notFound.message);
  }
  return result.data as T;
}

export async function turmaIdsDoProfessor(professorId: string): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM "Turma" WHERE professor_id = $1`,
    [professorId],
  );
  return rows.map((t) => t.id);
}

export async function matricularAlunoTurma(alunoId: string, turmaId: string) {
  const existing = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "MatriculaTurma" WHERE aluno_id = $1 AND turma_id = $2`,
    [alunoId, turmaId],
  );

  if (existing) {
    await execute(
      `UPDATE "MatriculaTurma" SET afastado = false WHERE id = $1`,
      [existing.id],
    );
    return;
  }

  await execute(
    `INSERT INTO "MatriculaTurma" (id, aluno_id, turma_id, matriculado_em, afastado)
     VALUES ($1, $2, $3, $4, false)`,
    [generateId(), alunoId, turmaId, now()],
  );
}

export function sumCentavos(rows: { valor_centavos: number }[]): number {
  return rows.reduce((acc, r) => acc + r.valor_centavos, 0);
}

/** PostgREST podia retornar relação 1:1 como objeto ou array. */
export function relOne<T>(rel: T | T[] | null | undefined): T | undefined {
  if (!rel) return undefined;
  return Array.isArray(rel) ? rel[0] : rel;
}
