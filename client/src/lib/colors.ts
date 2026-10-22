import type { CategoryBucket, Person } from '@/api/types';

/**
 * Lookups from a person, bucket or bar to a theme variable. The values live in
 * index.css, so the user tunes a colour there and every screen follows. The
 * strings are `var(--...)`, which an inline style accepts but arithmetic on
 * the colour does not. Identity colours paint only the person disc, the top
 * rail and the active menu icon, plus the current month in the 12-month chart
 * (ADR-0004); bucket colours and greys draw the other charts.
 */

/** Identity colours by slot (people.color_slot): Bruno has slot 0, Marina slot 1. Renaming never changes a colour. */
export const PERSON_COLORS = ['var(--person-0)', 'var(--person-1)', 'var(--person-2)', 'var(--person-3)'];

export const HOUSEHOLD_COLOR = 'var(--household)';
/** The rail and menu accent on screens that belong to the household: Importar and Configurações. */
export const SETTINGS_COLOR = 'var(--household)';

export const BUCKET_COLORS: Record<CategoryBucket, string> = {
  needs: 'var(--bucket-needs)',
  wants: 'var(--bucket-wants)',
  savings: 'var(--bucket-savings)',
};

export const UNCLASSIFIED_COLOR = 'var(--bucket-none)';
/** A bar that is not the one to look at. */
export const NEUTRAL_BAR = 'var(--bar-neutral)';
/** A bar in a chart with no bucket meaning, such as spending per account. */
export const STRONG_BAR = 'var(--bar-strong)';

/** The tint on a review line that still needs a look (Importar). Amber means "do this"; red is for errors and delete. */
export const NEEDS_YOU_ROW = 'bg-attention-soft/60';

export function personColor(person: Person): string {
  // `?? 0` guards a server older than this client, which sends no colorSlot.
  return PERSON_COLORS[(person.colorSlot ?? 0) % PERSON_COLORS.length]!;
}
