import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ApiError } from '@/api/client';
import { SectionCard } from '@/components/SectionCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const UNEXPECTED_ERROR = 'Erro inesperado. Tente de novo; se continuar, reinicie o Trocado.';

export function LoadingState() {
  return (
    <p role="status" className="py-10 text-center text-sm text-muted-foreground">
      Carregando…
    </p>
  );
}

/**
 * The placeholder for the inside of a card while its data loads: a few grey
 * bars where the content will be, so the page does not jump when it arrives.
 */
export function CardSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">Carregando…</span>
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

/**
 * The placeholder for a whole screen of cards while its first answer loads: a row
 * of three small cards, then two taller ones. It announces loading once, so a
 * screen reader does not hear one message per card.
 */
export function PageSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Carregando…</span>
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <SectionCard key={index} variant="compact">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-6 w-2/3" />
          </SectionCard>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((index) => (
          <SectionCard key={index}>
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </SectionCard>
        ))}
      </div>
    </div>
  );
}

/** The placeholder for a bordered list while it loads: the same frame, with grey rows. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" className="divide-y rounded-xl border">
      <span className="sr-only">Carregando…</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} data-slot="skeleton-row" className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * A failed read: an icon, the server's message and a retry. The default size is a
 * box that replaces a whole card or section. `inline` is one line that sits beside
 * whatever still works on the screen.
 */
export function ErrorState({
  error,
  onRetry,
  inline = false,
}: {
  error: ApiError | Error | null;
  onRetry: () => void;
  inline?: boolean;
}) {
  const message = error?.message ?? UNEXPECTED_ERROR;
  if (inline) {
    return (
      <p role="alert" className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <CircleAlert aria-hidden="true" className="size-4 shrink-0 text-destructive" />
        {message}
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Tentar de novo
        </Button>
      </p>
    );
  }
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 p-5 text-sm">
      <p className="flex items-start gap-2">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
        {message}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Tentar de novo
      </Button>
    </div>
  );
}

/** Nothing to show yet. `compact` is the smaller box for inside a card. */
export function EmptyState({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dashed text-center text-sm text-muted-foreground',
        compact ? 'p-4' : 'p-8',
      )}
    >
      {children}
    </div>
  );
}
