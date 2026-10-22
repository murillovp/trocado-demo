import type { BucketLabels } from '@/api/types';
import { parseKindFilter, type KindFilter } from './lines';
import { MONTH_PARAM, PERSON_PARAM } from './viewLink';

/** The budget pile a line lands in, as a link or a chart can filter Transações by. */
export type BucketFilter = 'needs' | 'wants' | 'savings' | 'unclassified';

/**
 * What a link to Transações can carry: the filters, and the month and person it opens on.
 * The address holds all of it, so a reload or a shared link shows the same list.
 */
export type LinkFilters = {
  /** Text for Buscar. */
  search?: string;
  kind?: Exclude<KindFilter, ''>;
  /** A category id, or 'none' for lines with no category. */
  categoryId?: string;
  /** Account ids. Written as `contas`, comma-separated. An empty list means every account. */
  accountIds?: string[];
  bucket?: BucketFilter;
  /** A savings label; '' means lines with no label. */
  savingsLabel?: string;
  /** A tag id: only lines carrying it. Written as `tag`. */
  tagId?: string;
  /** One day, as YYYY-MM-DD. Written as `dia`. It replaces the month for the list. */
  date?: string;
  /** List the lines of every month, not only the one on screen. Written as `meses=todos`. A `dia` still wins. */
  allMonths?: boolean;
  /** The month to open on, as YYYY-MM. */
  month?: string;
  /** A person id, or 'casa'. */
  scope?: string;
};

/** Address parameters that hold the filters, in the order a link writes them. */
/** `conta` is the old single-account name. A link still reads it, and a rewrite drops it. */
const FILTER_PARAMS = ['busca', 'tipo', 'categoria', 'contas', 'conta', 'balde', 'rotulo', 'tag', 'dia', 'meses'] as const;

/** The value of `meses` that lifts the month limit. */
const ALL_MONTHS_VALUE = 'todos';

export const BUCKET_FILTERS: readonly BucketFilter[] = ['needs', 'wants', 'savings', 'unclassified'];

export function bucketFilterLabel(bucket: BucketFilter, labels: BucketLabels): string {
  return bucket === 'unclassified' ? 'Sem grupo' : labels[bucket];
}

function toParams(filters: LinkFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.month !== undefined) params.set(MONTH_PARAM, filters.month);
  if (filters.scope !== undefined) params.set(PERSON_PARAM, filters.scope);
  if (filters.search !== undefined && filters.search !== '') params.set('busca', filters.search);
  if (filters.kind !== undefined) params.set('tipo', filters.kind);
  if (filters.categoryId !== undefined) {
    params.set('categoria', filters.categoryId === 'none' ? 'nenhuma' : filters.categoryId);
  }
  if (filters.accountIds !== undefined && filters.accountIds.length > 0) params.set('contas', filters.accountIds.join(','));
  if (filters.bucket !== undefined) params.set('balde', filters.bucket);
  if (filters.savingsLabel !== undefined) params.set('rotulo', filters.savingsLabel);
  if (filters.tagId !== undefined) params.set('tag', filters.tagId);
  if (filters.date !== undefined) params.set('dia', filters.date);
  if (filters.allMonths === true) params.set('meses', ALL_MONTHS_VALUE);
  return params;
}

/** "/transacoes?mes=2026-08&pessoa=casa&tipo=expense". Parameter names: mes, pessoa, busca, tipo, categoria, contas, balde, rotulo, tag, dia, meses. */
export function transacoesLink(filters: LinkFilters): string {
  const query = toParams(filters).toString();
  return query ? `/transacoes?${query}` : '/transacoes';
}

/**
 * The same address with its filters replaced by `filters`. The month, the person
 * and any other parameter stay as they were.
 */
export function withLinkFilters(params: URLSearchParams, filters: LinkFilters): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const name of FILTER_PARAMS) next.delete(name);
  const wanted = toParams({ ...filters, month: undefined, scope: undefined });
  for (const [name, value] of wanted) next.append(name, value);
  return next;
}

/** Reads the filters back. Unknown values are dropped; `categoria=nenhuma` becomes 'none'. The month and person are the view's to read. */
export function readLinkFilters(params: URLSearchParams): LinkFilters {
  const filters: LinkFilters = {};

  const busca = params.get('busca');
  if (busca !== null && busca !== '') filters.search = busca;

  const kind = parseKindFilter(params.get('tipo'));
  if (kind !== '') filters.kind = kind;

  const categoria = params.get('categoria');
  if (categoria !== null) filters.categoryId = categoria === 'nenhuma' ? 'none' : categoria;

  // `contas` wins over the old `conta`, which still opens a link made before several accounts could be chosen.
  const contas = (params.get('contas') ?? '').split(',').filter((id) => id !== '');
  const conta = params.get('conta');
  if (contas.length > 0) filters.accountIds = contas;
  else if (conta !== null && conta !== '') filters.accountIds = [conta];

  const balde = params.get('balde');
  if (balde !== null && (BUCKET_FILTERS as readonly string[]).includes(balde)) filters.bucket = balde as BucketFilter;

  const rotulo = params.get('rotulo');
  if (rotulo !== null) filters.savingsLabel = rotulo;

  const tag = params.get('tag');
  if (tag !== null && tag !== '') filters.tagId = tag;

  const dia = params.get('dia');
  if (dia !== null && /^\d{4}-\d{2}-\d{2}$/.test(dia)) filters.date = dia;

  if (params.get('meses') === ALL_MONTHS_VALUE) filters.allMonths = true;

  return filters;
}

/** The values behind the filters on Transações. Month and person are not filters. */
export type FilterValues = {
  search: string;
  /** The accounts of the shown person that are chosen. Empty means all accounts. */
  accountIds: string[];
  categoryId: string;
  kind: KindFilter;
  bucket: BucketFilter | undefined;
  savingsLabel: string | undefined;
  /** A tag id, or '' for any tag. */
  tagId: string;
  /** One day (YYYY-MM-DD), or '' for the whole month. */
  date: string;
  /** True when the list runs over every month (`meses=todos`). */
  allMonths: boolean;
};

/** How many of the filters are on. */
export function countActiveFilters(values: FilterValues): number {
  const active = [
    values.search.trim() !== '',
    values.accountIds.length > 0,
    values.categoryId !== '',
    values.kind !== '',
    values.bucket !== undefined,
    values.savingsLabel !== undefined,
    values.tagId !== '',
    values.date !== '',
    values.allMonths,
  ];
  return active.filter(Boolean).length;
}

/**
 * How many of the filters behind the phone's "Filtros" button are on: accounts,
 * category, type and tag. Buscar shows its own text, and the link chips show as chips,
 * so neither counts here. A category set to "none" counts.
 */
export function countPanelFilters(values: Pick<FilterValues, 'accountIds' | 'categoryId' | 'kind' | 'tagId'>): number {
  return [values.accountIds.length > 0, values.categoryId !== '', values.kind !== '', values.tagId !== ''].filter(Boolean).length;
}
