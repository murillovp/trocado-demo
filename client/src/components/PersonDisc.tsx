import { House } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = { name: string; color: string; household?: boolean; size?: 'sm' | 'md' | 'lg' };

const SIZES = { sm: 'size-6 text-micro', md: 'size-8 text-sm', lg: 'size-11 text-base' };

/** The identity disc: the person's colour and initial. Casa shows a house. */
export function PersonDisc({ name, color, household = false, size = 'md' }: Props) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', SIZES[size])}
      style={{ backgroundColor: color }}
    >
      {household ? <House className="size-[55%]" /> : name.slice(0, 1).toUpperCase()}
    </span>
  );
}
