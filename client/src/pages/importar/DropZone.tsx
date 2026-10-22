import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Picked } from './useUploadFlow';

type Props = {
  picked: Picked[];
  /** True while a file is being checked or imported: nothing new is taken. */
  locked: boolean;
  onChoose: (files: File[]) => void;
};

/**
 * Where a file comes from: dropped on the box, or chosen with the button. The
 * file input stays reachable by keyboard while locked and says so with
 * `aria-disabled`; the lock only stops it from taking a file.
 */
export function DropZone({ picked, locked, onChoose }: Props) {
  const [dragging, setDragging] = useState(false);

  function take(files: File[]) {
    if (!locked && files.length) onChoose(files);
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!locked) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        take(Array.from(event.dataTransfer.files));
      }}
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm',
        dragging && 'bg-muted',
        locked && 'opacity-60',
      )}
    >
      <span className={picked.length ? 'font-medium' : 'text-muted-foreground'}>
        {picked.length === 0 ? 'Arraste o arquivo para cá' : picked.length === 1 ? picked[0]!.file.name : `${picked.length} arquivos escolhidos`}
      </span>
      <label
        className={cn(
          'rounded-sm font-medium underline underline-offset-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2',
          locked ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
      >
        Escolher arquivo
        <input
          type="file"
          multiple
          className="sr-only"
          aria-disabled={locked}
          onClick={(event) => {
            if (locked) event.preventDefault();
          }}
          onChange={(event) => {
            const chosen = Array.from(event.target.files ?? []);
            // Clear the input so choosing the same file again still fires a change.
            event.target.value = '';
            take(chosen);
          }}
        />
      </label>
    </div>
  );
}
