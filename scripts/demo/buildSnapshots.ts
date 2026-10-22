import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../../server/http/app';
import { snapshotName, splitRequestPath } from '../../shared/demoSnapshot';
import { buildDemoDb } from './buildDemoDb';
import { demoMonths } from './drafts';

const OUTPUT_DIR = path.resolve(process.argv[2] ?? 'client/public/demo-data');
const ANALYSIS_PATHS = ['/api/analysis/month', '/api/analysis/year', '/api/analysis/week'] as const;

type Row = { id: string };

async function main(): Promise<void> {
  const workDir = mkdtempSync(path.join(tmpdir(), 'trocado-demo-'));
  const { db, householdId } = buildDemoDb(path.join(workDir, 'demo.db'));
  const server = createApp({ db, householdId }).listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });
  let written = 0;

  async function save(requestPath: string): Promise<unknown> {
    const response = await fetch(`${base}${requestPath}`);
    if (!response.ok) throw new Error(`${requestPath} answered ${response.status}: ${await response.text()}`);
    const body = await response.json();
    const { path: address, params } = splitRequestPath(requestPath);
    writeFileSync(path.join(OUTPUT_DIR, snapshotName(address, params)), JSON.stringify(body));
    written += 1;
    return body;
  }

  try {
    for (const address of ['household', 'accounts', 'categories', 'installments', 'integrity', 'months/latest', 'settings', 'vendors', 'transactions']) {
      await save(`/api/${address}`);
    }
    const importsAnswer = (await save('/api/imports')) as { imports: Row[] };
    for (const item of importsAnswer.imports) await save(`/api/imports/${item.id}`);
    const peopleAnswer = (await save('/api/people')) as { people: Row[] };
    const tagsAnswer = (await save('/api/tags')) as { tags: Row[] };
    const categoriesAnswer = (await save('/api/categories')) as { categories: (Row & { appliesTo?: string })[] };
    const scopes: (string | undefined)[] = [undefined, ...peopleAnswer.people.map((person) => person.id)];
    const expenseCategories = categoriesAnswer.categories.filter((category) => category.appliesTo !== 'income');

    for (const scope of scopes) {
      const person = scope ? `&personId=${scope}` : '';
      const personOnly = scope ? `?personId=${scope}` : '';
      await save(`/api/analysis/tags${personOnly}`);
      for (const tag of tagsAnswer.tags) await save(`/api/analysis/tags?${scope ? `personId=${scope}&` : ''}tagId=${tag.id}`);
      for (const month of demoMonths()) {
        const key = `${month.year}-${String(month.month).padStart(2, '0')}`;
        await save(`/api/reports/month?month=${key}${person}`);
        await save(`/api/reports/history?month=${key}${person}`);
        if (scope) await save(`/api/reports/budget?month=${key}${person}`);
        for (const analysis of ANALYSIS_PATHS) {
          await save(`${analysis}?month=${key}${person}`);
          for (const category of expenseCategories) await save(`${analysis}?month=${key}${person}&categoryId=${category.id}`);
        }
      }
    }
    console.log(`Saved ${written} answers to ${OUTPUT_DIR}`);
  } finally {
    server.close();
    rmSync(workDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
