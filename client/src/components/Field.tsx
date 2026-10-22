import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string | null;
  /**
   * For fields side by side in a grid with three `auto` rows. The label, the control and the message
   * each take one of those rows, so the boxes line up however many lines a label wraps to.
   */
  alignRows?: boolean;
};

type ControlProps = { 'aria-describedby'?: string; 'aria-invalid'?: boolean };

/**
 * One labelled control. The label wraps the control, so the pair is linked
 * without ids. The hint or error sits outside the label, so the control's
 * accessible name stays exactly `label`.
 *
 * The hint or error is tied to the control with `aria-describedby`, and an error
 * also sets `aria-invalid`. The field clones its one child to add them, which is
 * simpler than a context every control would have to read. The child must be one
 * element that takes those two props: an input, a select or the category picker.
 */
export function Field({ label, children, hint, error, alignRows }: Props) {
  const id = useId();
  const messageId = error || hint ? `${id}-message` : undefined;
  const control =
    messageId && isValidElement<ControlProps>(children)
      ? cloneElement(children as ReactElement<ControlProps>, {
          'aria-describedby': [children.props['aria-describedby'], messageId].filter(Boolean).join(' '),
          ...(error ? { 'aria-invalid': true } : {}),
        })
      : children;

  return (
    <div className={cn('min-w-0', alignRows ? 'row-span-3 grid grid-rows-subgrid gap-y-1.5' : 'flex flex-col gap-1.5')}>
      <label className={cn('min-w-0', alignRows ? 'contents' : 'flex flex-col gap-1.5')}>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {control}
      </label>
      {error ? (
        <span id={messageId} role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : hint ? (
        <span id={messageId} className="text-xs text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
