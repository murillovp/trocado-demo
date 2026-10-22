import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '@/components/IconButton';

/**
 * A filter that came from a link and can be taken off: a muted pill with the filter's
 * words and an X button. It has no outline and its text is not pressable, so it never
 * reads as one more option of the segmented control.
 */
export function FilterChip({
  removeLabel,
  onRemove,
  children,
}: {
  /** Names the X button, for example "Tirar filtro Grupo: Necessidades". */
  removeLabel: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pr-1 pl-3 text-sm">
      <span>{children}</span>
      <IconButton label={removeLabel} onClick={onRemove} className="size-6 rounded-full">
        <X aria-hidden="true" />
      </IconButton>
    </span>
  );
}
