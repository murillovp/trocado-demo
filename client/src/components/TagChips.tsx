import { Tag as TagIcon } from 'lucide-react';
import type { Tag } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Props = {
  tags: Tag[];
  /** How many chips show before the rest fold into "+N". */
  max?: number;
  /** Names the group for assistive technology. A screen that shows two groups at once gives each its own name. */
  label?: string;
  className?: string;
};

/**
 * A line's tags as small read-only chips, at most `max` of them, then "+N" with the folded names
 * as its hover title. A line with no tags shows nothing. A long name is cut short with an ellipsis.
 */
export function TagChips({ tags, max = 2, label = 'Tags do lançamento', className }: Props) {
  if (tags.length === 0) return null;
  const shown = tags.slice(0, max);
  const folded = tags.slice(max);
  return (
    <span role="group" aria-label={label} className={cn('flex min-w-0 flex-wrap items-center gap-1', className)}>
      {shown.map((tag) => (
        <Badge key={tag.id} variant="outline" className="max-w-40 min-w-0">
          <TagIcon aria-hidden="true" />
          <span className="truncate">{tag.name}</span>
        </Badge>
      ))}
      {folded.length > 0 ? (
        <span title={folded.map((tag) => tag.name).join(', ')} className="shrink-0 text-xs text-muted-foreground">
          +{folded.length}
        </span>
      ) : null}
    </span>
  );
}
