import type { ImportStepEvent } from '../../../shared/contract/imports';

export type { ImportStepEvent };

/** Called as each step of an import starts, so the screen can say what is happening. */
export type OnStep = (event: ImportStepEvent) => void;
