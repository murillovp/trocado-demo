import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import { useViewPath } from '@/app/view';
import { FOCUS_RING } from '@/lib/interaction';
import { cn } from '@/lib/utils';

/**
 * A link inside a sentence: always underlined, in the text colour, with the focus ring.
 * An address inside the app keeps the month and person on screen.
 */
export function TextLink({ className, to, ...props }: ComponentProps<typeof Link>) {
  const viewPath = useViewPath();
  return (
    <Link
      className={cn('rounded-sm underline underline-offset-4', FOCUS_RING, className)}
      to={typeof to === 'string' ? viewPath(to) : to}
      {...props}
    />
  );
}
