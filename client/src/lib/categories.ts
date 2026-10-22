import type { BucketLabels, Category, CategoryBucket } from '@/api/types';
import { BUCKET_COLORS, UNCLASSIFIED_COLOR } from './colors';

export type CategoryGroupKey = CategoryBucket | 'none' | 'income';
export type CategoryGroup = { key: CategoryGroupKey; label: string; color: string; items: Category[] };

/** The server's order: sort order, then name. */
export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'pt-BR'));
}

function groupKey(category: Category): CategoryGroupKey {
  if (category.appliesTo === 'income') return 'income';
  return category.bucket ?? 'none';
}

export function groupCategories(categories: Category[], labels: BucketLabels): CategoryGroup[] {
  const sorted = sortCategories(categories);
  const of = (key: CategoryGroupKey) => sorted.filter((category) => groupKey(category) === key);
  const groups: CategoryGroup[] = [
    { key: 'needs', label: labels.needs, color: BUCKET_COLORS.needs, items: of('needs') },
    { key: 'wants', label: labels.wants, color: BUCKET_COLORS.wants, items: of('wants') },
    { key: 'savings', label: labels.savings, color: BUCKET_COLORS.savings, items: of('savings') },
    { key: 'none', label: 'Sem grupo', color: UNCLASSIFIED_COLOR, items: of('none') },
    { key: 'income', label: 'Entradas', color: UNCLASSIFIED_COLOR, items: of('income') },
  ];
  return groups.filter((group) => group.key !== 'none' || group.items.length > 0);
}

/**
 * Moves a category one place up or down inside its group and returns the ids of
 * the whole list in the new order, which the server numbers 0, 1, 2… in one go.
 * Returns an empty list when there is nothing to move: the category is unknown
 * or already at the edge of its group.
 */
export function moveCategory(categories: Category[], id: string, direction: -1 | 1): string[] {
  const moving = categories.find((category) => category.id === id);
  if (!moving) return [];
  const group = sortCategories(categories).filter((category) => groupKey(category) === groupKey(moving));
  const neighbor = group[group.findIndex((category) => category.id === id) + direction];
  if (!neighbor) return [];

  const ordered = sortCategories(categories).filter((category) => category.id !== id);
  const at = ordered.findIndex((category) => category.id === neighbor.id) + (direction === 1 ? 1 : 0);
  ordered.splice(at, 0, moving);

  return ordered.map((category) => category.id);
}
