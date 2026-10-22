import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RunResult } from 'better-sqlite3';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import * as schema from './schema';

const MIGRATIONS_FOLDER = fileURLToPath(new URL('./migrations', import.meta.url));

/**
 * Opens the SQLite file at `path`, applies any pending migrations, and returns
 * the Drizzle handle. Creating the folder here means a first run needs no setup.
 */
export function openDatabase(path: string) {
  mkdirSync(dirname(path), { recursive: true });
  const connection = new Database(path);
  connection.pragma('journal_mode = WAL');
  connection.pragma('foreign_keys = ON');
  // Deleted and cleared bytes (old bank files, ADR-0014) are overwritten, not left in free pages.
  connection.pragma('secure_delete = ON');

  const db = drizzle(connection, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}

export type Db = ReturnType<typeof openDatabase>;

/**
 * What a data-access function needs: the open database or a transaction inside
 * it. Taking this instead of `Db` lets one service call write several tables
 * all-or-nothing through `db.transaction((tx) => ...)`.
 */
export type DbExecutor = BaseSQLiteDatabase<'sync', RunResult, typeof schema>;
