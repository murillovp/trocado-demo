import { rmSync } from 'node:fs';
import { runIntegrityChecks, integrityLogLine } from '../../server/services/integrity';
import { buildDemoDb } from './buildDemoDb';

const path = process.argv[2]!;
rmSync(path, { force: true });
const { db, householdId } = buildDemoDb(path);
const problems = runIntegrityChecks(db, householdId);
console.log('integrity problems:', problems.length);
for (const p of problems.slice(0, 10)) console.log(integrityLogLine(p));
