import { existsSync } from 'node:fs';
import path from 'node:path';
import { openDatabase } from './db/client';
import { seedHousehold } from './db/seed';
import { createApp } from './http/app';
import { integrityLogLine, runIntegrityChecks } from './services/integrity';

const databasePath = process.env.TROCADO_DB_PATH ?? './data/trocado.db';
const port = Number(process.env.PORT ?? 3000);
const clientDir = path.resolve(process.env.TROCADO_CLIENT_DIR ?? 'client/dist');

const db = openDatabase(databasePath);
const { householdId } = seedHousehold(db);
for (const problem of runIntegrityChecks(db, householdId)) console.warn(integrityLogLine(problem));
const app = createApp({
  db,
  householdId,
  clientDir: existsSync(path.join(clientDir, 'index.html')) ? clientDir : undefined,
});

app.listen(port, () => {
  console.log(`Trocado is running on http://localhost:${port}`);
});
