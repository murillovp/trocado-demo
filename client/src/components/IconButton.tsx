import type { ComponentProps, ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = Omit<ComponentProps<typeof Button>, 'size' | 'variant' | 'asChild' | 'title' | 'aria-label'> & {
  /** What the button does. It becomes both the accessible name and the tooltip. */
  label: string;
  variant?: 'ghost' | 'outline';
};

/** The look both icon-only parts share: 32 px, a bigger tap area, the muted colour on the ghost variant. */
function iconControlClass(variant: 'ghost' | 'outline', className?: string): string {
  return cn(
    'relative after:absolute after:-inset-1.5 md:after:-inset-1',
    variant === 'ghost' && 'text-muted-foreground hover:text-foreground',
    className,
  );
}

/**
 * The one button that shows only an icon. It looks 32 px. It takes taps in a 44 px
 * area on phones and a 40 px area from `md`. The convention for per-item actions (rename, move, archive, open) lives here.
 */
export function IconButton({ label, variant = 'ghost', type = 'button', className, ...props }: Props) {
  return (
    <Button
      type={type}
      variant={variant}
      size="icon-sm"
      aria-label={label}
      title={label}
      className={iconControlClass(variant, className)}
      {...props}
    />
  );
}

/**
 * An icon that goes to another page, drawn like `IconButton`. It is a real link, so middle-click,
 * "open in new tab" and a screen reader's "link" all work; use `IconButton` for an action that stays on the page.
 */
export function IconLink({
  label,
  to,
  variant = 'ghost',
  className,
  children,
}: {
  /** Where the link goes. It becomes both the accessible name and the tooltip. */
  label: string;
  to: string;
  variant?: 'ghost' | 'outline';
  className?: string;
  children: ReactNode;
}) {
  return (
    <Button asChild variant={variant} size="icon-sm" className={iconControlClass(variant, className)}>
      <Link to={to} aria-label={label} title={label}>
        {children}
      </Link>
    </Button>
  );
}
