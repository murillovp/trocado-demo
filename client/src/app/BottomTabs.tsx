import { Link, useLocation } from 'react-router';
import { FOCUS_RING } from '@/lib/interaction';
import { cn } from '@/lib/utils';
import { branchOf, MENU } from './menuTree';
import { useViewPath } from './view';

/** The five top-level items as tabs along the bottom, on narrow windows only. Each keeps the month and person on screen. */
export function BottomTabs({ accent }: { accent: string }) {
  const { pathname } = useLocation();
  const viewPath = useViewPath();
  const current = branchOf(pathname);
  return (
    <nav aria-label="Menu" className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t bg-background md:hidden">
      {MENU.map((node) => {
        const Icon = node.icon;
        const active = current?.to === node.to;
        return (
          <Link
            key={node.to}
            to={viewPath(node.to)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-w-0 flex-col items-center gap-1 py-2 text-micro',
              FOCUS_RING,
              active ? 'font-semibold text-foreground' : 'text-muted-foreground',
            )}
          >
            <Icon aria-hidden="true" className="size-5" style={{ color: active ? accent : undefined }} />
            {node.short}
          </Link>
        );
      })}
    </nav>
  );
}
