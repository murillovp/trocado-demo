import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useLocation, useMatch } from 'react-router';
import { IconButton } from '@/components/IconButton';
import { FOCUS_RING } from '@/lib/interaction';
import { cn } from '@/lib/utils';
import { branchOf, MENU, type MenuNode } from './menuTree';
import { useViewPath } from './view';

/**
 * The side menu. A top-level item always goes to its own page and opens its
 * branch; the chevron alone opens and closes the branch without leaving the
 * page. The branch holding the current page opens on load (ADR-0004).
 * Every link keeps the month and person on screen.
 */
export function Menu({ accent }: { accent: string }) {
  const { pathname } = useLocation();
  const viewPath = useViewPath();
  const current = branchOf(pathname);
  const [open, setOpen] = useState<Record<string, boolean>>(() => (current ? { [current.to]: true } : {}));
  const [openedFor, setOpenedFor] = useState(current?.to);

  // Moving into a branch opens it, even if it was closed by hand. Adjusted while rendering, so no frame shows it shut.
  if (current?.to !== openedFor) {
    setOpenedFor(current?.to);
    if (current) setOpen((state) => (state[current.to] ? state : { ...state, [current.to]: true }));
  }

  return (
    <nav aria-label="Menu principal">
      <ul className="flex flex-col gap-0.5">
        {MENU.map((node) => {
          const inBranch = current?.to === node.to;
          const isOpen = open[node.to] === true;
          return (
            <li key={node.to}>
              <MenuRow
                node={node}
                accent={accent}
                inBranch={inBranch}
                isOpen={isOpen}
                to={viewPath(node.to)}
                onOpen={() => setOpen((state) => ({ ...state, [node.to]: true }))}
                onToggle={() => setOpen((state) => ({ ...state, [node.to]: !isOpen }))}
              />
              {node.children && isOpen ? (
                <ul className="mt-0.5 flex flex-col gap-0.5">
                  {node.children.map((child) => (
                    <li key={child.to}>
                      <NavLink
                        to={viewPath(child.to)}
                        className={({ isActive }) =>
                          cn(
                            'block rounded-md py-1.5 pl-10 pr-3 text-body transition-colors',
                            FOCUS_RING,
                            isActive ? 'bg-background font-semibold shadow-sm' : 'text-muted-foreground hover:bg-hover',
                          )
                        }
                      >
                        {child.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * One top-level item. The row holds the link and, for an item with pages under it, the arrow
 * button. The row draws the hover and the selected background, so both parts sit inside one
 * box: hovering either part lights the whole row, and the arrow stays its own button with its
 * own name and focus ring.
 */
function MenuRow({
  node,
  accent,
  inBranch,
  isOpen,
  to,
  onOpen,
  onToggle,
}: {
  node: MenuNode;
  accent: string;
  inBranch: boolean;
  isOpen: boolean;
  to: string;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const Icon = node.icon;
  const isActive = useMatch({ path: node.to, end: true }) !== null;
  return (
    <div
      className={cn(
        'flex items-center rounded-md transition-colors',
        isActive ? 'bg-background shadow-sm' : 'hover:bg-hover',
      )}
    >
      <NavLink
        to={to}
        end
        onClick={() => {
          if (node.children) onOpen();
        }}
        className={cn(
          'flex flex-1 items-center gap-2.5 rounded-md px-3 py-2 text-sm',
          FOCUS_RING,
          isActive ? 'font-semibold' : 'text-muted-foreground',
          inBranch && 'font-semibold text-foreground',
        )}
      >
        <Icon aria-hidden="true" className="size-[18px]" style={{ color: inBranch ? accent : undefined }} />
        {node.label}
      </NavLink>
      {node.children ? (
        <IconButton
          label={`Abrir ou fechar as páginas de ${node.label}`}
          aria-expanded={isOpen}
          // The row already shows the hover, so the arrow adds none of its own.
          className="mr-1 hover:bg-transparent"
          onClick={onToggle}
        >
          <ChevronRight aria-hidden="true" className={cn('size-3.5 transition-transform', isOpen && 'rotate-90')} />
        </IconButton>
      ) : null}
    </div>
  );
}
