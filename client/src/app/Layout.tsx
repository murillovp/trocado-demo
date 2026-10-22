import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { PageSkeleton } from '@/components/States';
import { BottomTabs } from './BottomTabs';
import { Menu } from './Menu';
import { accentFor, offersHousehold, pageTitle } from './menuTree';
import { ScreenErrorBoundary } from './ScreenErrorBoundary';
import { useSubject, useView } from './view';

/** The frame around every screen: the side menu, the coloured rail, the bottom tabs. */
export function Layout() {
  const { pathname } = useLocation();
  const { subject } = useSubject({ allowHousehold: offersHousehold(pathname) });
  const { monthPending } = useView();
  const accent = accentFor(pathname, subject?.color ?? null);
  const subjectName = subject?.name ?? null;

  useEffect(() => {
    document.title = pageTitle(pathname, subjectName);
  }, [pathname, subjectName]);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-56 shrink-0 flex-col gap-6 border-r bg-muted/50 px-3 py-6 md:flex">
        <span className="px-3 text-2xl font-semibold tracking-tight">Trocado</span>
        <Menu accent={accent} />
      </aside>
      <main className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <p className="bg-muted px-4 py-2 text-center text-sm text-muted-foreground">
          Demonstração com dados de exemplo. Nada é salvo e nenhum dado real aparece aqui.
        </p>
        <div data-testid="rail" aria-hidden="true" className="h-1.5 shrink-0" style={{ backgroundColor: accent }} />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8">
          <ScreenErrorBoundary key={pathname}>
            {/* Until the opening month is known, no screen asks for the calendar month's data. */}
            {monthPending ? <PageSkeleton /> : <Outlet />}
          </ScreenErrorBoundary>
        </div>
      </main>
      <BottomTabs accent={accent} />
    </div>
  );
}
