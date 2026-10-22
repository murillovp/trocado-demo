import type { ImportSummary } from '../../../shared/contract/imports';
import type { VendorClassifier } from '../../ai/types';
import type { Db } from '../../db/client';
import type { OnStep } from './progress';

export type { ImportSummary };

/** What every import needs from the outside: the database, the AI (or none), and where to report progress. */
export type ImportDeps = { db: Db; classifier: VendorClassifier | null; newId?: () => string; onStep?: OnStep };
