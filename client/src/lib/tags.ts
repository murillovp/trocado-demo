import type { Tag } from '@/api/types';
import { plural } from './format';

/** What a bulk tag request does to the selected lines. */
export type TagAction = 'add' | 'remove';

/** "Tag "Lisboa 2026" adicionada a 3 lançamentos." and its mirror for remove. */
export function bulkTagMessage(action: TagAction, tagName: string, changed: number): string {
  if (changed === 0) return 'Nenhum lançamento mudou.';
  const lines = plural(changed, 'lançamento', 'lançamentos');
  return action === 'add' ? `Tag "${tagName}" adicionada a ${lines}.` : `Tag "${tagName}" removida de ${lines}.`;
}

/** The tags in these lists, each once, sorted by name. "Remover tag" offers the tags on the selected lines. */
export function distinctTags(lists: Iterable<readonly Tag[]>): Tag[] {
  const byId = new Map<string, Tag>();
  for (const list of lists) for (const tag of list) byId.set(tag.id, tag);
  return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
}
