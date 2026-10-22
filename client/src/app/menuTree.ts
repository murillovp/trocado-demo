import { ArrowLeftRight, ChartColumn, ChartPie, SlidersHorizontal, TrendingUp, type LucideIcon } from 'lucide-react';
import { HOUSEHOLD_COLOR, SETTINGS_COLOR } from '@/lib/colors';

export type MenuNode = {
  label: string;
  /** The label under the icon in the bottom tabs. */
  short: string;
  to: string;
  icon: LucideIcon;
  children?: { label: string; to: string }[];
};

/** The icon tree from ADR-0004. */
export const MENU: MenuNode[] = [
  { label: 'Visão do mês', short: 'Visão', to: '/', icon: ChartColumn },
  { label: 'Orçamento', short: 'Orçamento', to: '/orcamento', icon: ChartPie },
  { label: 'Análise', short: 'Análise', to: '/analise', icon: TrendingUp },
  {
    label: 'Transações',
    short: 'Transações',
    to: '/transacoes',
    icon: ArrowLeftRight,
    children: [
      { label: 'Parcelas', to: '/transacoes/parcelas' },
    ],
  },
  {
    label: 'Configurações',
    // Shortened: five tabs leave 72 px each at 375 px, and "Configurações" in bold is 77 px.
    short: 'Config.',
    to: '/configuracoes',
    icon: SlidersHorizontal,
    children: [
      { label: 'Categorias', to: '/configuracoes/categorias' },
      { label: 'Tags', to: '/configuracoes/tags' },
      { label: 'Fornecedores', to: '/configuracoes/fornecedores' },
      { label: 'Pessoas e contas', to: '/configuracoes/pessoas' },
    ],
  },
];

/** The top-level item whose page or branch holds `pathname`. */
export function branchOf(pathname: string): MenuNode | undefined {
  return MENU.find((node) =>
    node.to === '/' ? pathname === '/' : pathname === node.to || pathname.startsWith(`${node.to}/`),
  );
}

/** Screens that belong to the household rather than to a person (ADR-0004). */
function isHouseholdScreen(pathname: string): boolean {
  return pathname.startsWith('/configuracoes') || pathname.startsWith('/transacoes/importar');
}

/** The colour for the top rail and the active menu icon. */
export function accentFor(pathname: string, subjectColor: string | null): string {
  if (isHouseholdScreen(pathname)) return SETTINGS_COLOR;
  return subjectColor ?? HOUSEHOLD_COLOR;
}

/** Orçamento measures one person against their own income, so it has no Casa. */
export function offersHousehold(pathname: string): boolean {
  return !pathname.startsWith('/orcamento');
}

const IMPORT_REVIEW_PREFIX = '/transacoes/importar/';

/** The screen's own name, from `MENU`, or null when the address matches no screen. */
function screenName(rawPathname: string): string | null {
  const pathname = rawPathname.length > 1 && rawPathname.endsWith('/') ? rawPathname.slice(0, -1) : rawPathname;
  if (pathname.startsWith(IMPORT_REVIEW_PREFIX)) return 'Revisar importação';
  for (const node of MENU) {
    if (node.to === pathname) return node.label;
    const child = node.children?.find((item) => item.to === pathname);
    if (child) return child.label;
  }
  return null;
}

/** The browser tab title: the screen, the person or Casa where the screen has one, then the app. */
export function pageTitle(pathname: string, subjectName: string | null): string {
  const name = screenName(pathname);
  if (!name) return 'Página não encontrada · Trocado';
  const parts = !isHouseholdScreen(pathname) && subjectName ? [name, subjectName, 'Trocado'] : [name, 'Trocado'];
  return parts.join(' · ');
}
