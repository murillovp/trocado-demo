import type { ReactNode } from 'react';

/** The top of a screen that has no person or month selector: a small label above the page title, then one line of intro. */
export function PageHeader({ eyebrow, title, intro }: { eyebrow: string; title: string; intro: ReactNode }) {
  return (
    <header className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{eyebrow}</span>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">{intro}</p>
    </header>
  );
}
