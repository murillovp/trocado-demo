import { Plus } from 'lucide-react';
import type { Tag } from '@/api/types';
import { useTags } from '@/api/queries';
import { FilterChip } from '@/components/FilterChip';
import { TagCombobox } from '@/components/TagCombobox';
import { Button } from '@/components/ui/button';

type Props = {
  /** The tags now on the line, or on the review row. */
  value: Tag[];
  onChange: (tags: Tag[]) => void;
  /** The field's name. Also the group's accessible name. */
  label?: string;
  disabled?: boolean;
};

/**
 * The "Tags" field: the line's tags as chips that each have a remove button, then an "Adicionar tag"
 * button that opens the searchable list, which also creates a new tag from a typed name.
 * It holds no state of its own: the parent keeps the tag list and decides when to save it.
 */
export function TagPicker({ value, onChange, label = 'Tags', disabled }: Props) {
  const tags = useTags().data ?? [];
  const chosen = new Set(value.map((tag) => tag.id));
  return (
    <div role="group" aria-label={label} className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((tag) => (
          <FilterChip key={tag.id} removeLabel={`Tirar tag ${tag.name}`} onRemove={() => onChange(value.filter((other) => other.id !== tag.id))}>
            {tag.name}
          </FilterChip>
        ))}
        <TagCombobox
          trigger={
            <Button type="button" variant="outline" size="sm" disabled={disabled}>
              <Plus aria-hidden="true" />
              Adicionar tag
            </Button>
          }
          options={tags.filter((tag) => !chosen.has(tag.id))}
          known={tags}
          allowCreate
          onPick={(tag) => onChange(chosen.has(tag.id) ? value : [...value, tag])}
        />
      </div>
    </div>
  );
}
