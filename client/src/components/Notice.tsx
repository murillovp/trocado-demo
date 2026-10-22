import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const TONES = {
  neutral: 'bg-muted/40',
  attention: 'border-attention/40 bg-attention-soft',
  error: 'border-destructive/40',
} as const;

/**
 * A short message in a box: neutral for information, attention for something that
 * needs the user, error for a problem. Pass `role="status"` or `role="alert"` when
 * the message appears while the user is on the screen.
 */
export function Notice({
  tone = 'neutral',
  className,
  ...props
}: ComponentProps<'div'> & { tone?: keyof typeof TONES }) {
  return <div className={cn('flex flex-col gap-2 rounded-lg border p-4 text-sm', TONES[tone], className)} {...props} />;
}
