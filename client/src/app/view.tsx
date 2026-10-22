import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { useLatestMonth, usePeople } from '@/api/queries';
import type { Person } from '@/api/types';
import { HOUSEHOLD_COLOR, personColor } from '@/lib/colors';
import { currentMonth } from '@/lib/format';
import { transacoesLink, type LinkFilters } from '@/lib/transacoesLink';
import { MONTH_PARAM, PERSON_PARAM, withView } from '@/lib/viewLink';

/** The scope value that means the whole household. Any other scope is a person id. */
export const HOUSEHOLD = 'casa';
export type Scope = string;

const SCOPE_KEY = 'trocado.escopo';
const PERSON_KEY = 'trocado.pessoa';
/** How long the app waits for the latest month before it opens on the calendar month. */
export const LATEST_MONTH_WAIT_MS = 3000;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function isMonth(value: string | null | undefined): value is string {
  return value !== null && value !== undefined && MONTH_PATTERN.test(value);
}

/** Browser storage can be missing or blocked; the app then simply forgets. */
function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Nothing to do: the choice lasts for this visit only.
  }
}

type ViewState = {
  month: string;
  setMonth: (month: string) => void;
  /** True while the app still asks which month to open on; screens show their loading state meanwhile. */
  monthPending: boolean;
  scope: Scope;
  setScope: (scope: Scope) => void;
  /** The last person picked, for screens that have no Casa. */
  lastPersonId: string | null;
};

const ViewContext = createContext<ViewState | null>(null);

/**
 * The month and the person on screen. The address is the one source: `?mes=2026-10`
 * and `?pessoa=<id>` (or `casa`). With no `mes` the app opens on the latest month that
 * has lines, asked once per app load; if that answer fails, says nothing or never comes,
 * it opens on the current month. A `mes` in the address always wins, even over an answer
 * that arrives late. With no `pessoa` the person is the last one chosen on this device.
 * A change replaces the address entry, so Back does not step through every month. Must sit
 * inside the router. `initialMonth` fixes the opening month and skips the question (tests).
 */
export function ViewProvider({ children, initialMonth }: { children: ReactNode; initialMonth?: string }) {
  const [params, setParams] = useSearchParams();
  const addressMonth = params.get(MONTH_PARAM);
  const addressScope = params.get(PERSON_PARAM);
  const addressHasMonth = isMonth(addressMonth);

  // The month a bare address opens on: the calendar month, or the latest month with lines once it is known.
  const [openingMonth, setOpeningMonth] = useState(() => initialMonth ?? currentMonth());
  const [asking, setAsking] = useState(() => initialMonth === undefined && !addressHasMonth);
  const latest = useLatestMonth(asking);

  const month = addressHasMonth ? addressMonth : openingMonth;
  const monthPending = asking && !addressHasMonth;

  const scope = addressScope ? addressScope : (readStored(SCOPE_KEY) ?? HOUSEHOLD);

  // An id in the address counts only if it names a real person. Until the people load, it is taken at its word.
  const people = usePeople().data;
  const addressPersonKnown = addressScope !== null && addressScope !== HOUSEHOLD && (people === undefined || people.some((person) => person.id === addressScope));
  const lastPersonId = addressPersonKnown ? addressScope : readStored(PERSON_KEY);

  // Casa, or a person who arrives through the address, is remembered too, so a fresh visit opens on them.
  // An id that matches nobody is never stored: it would replace the person remembered before.
  useEffect(() => {
    if (!addressScope) return;
    if (addressScope === HOUSEHOLD) {
      writeStored(SCOPE_KEY, HOUSEHOLD);
      return;
    }
    if (!people?.some((person) => person.id === addressScope)) return;
    writeStored(SCOPE_KEY, addressScope);
    writeStored(PERSON_KEY, addressScope);
  }, [addressScope, people]);

  const setAddress = useCallback(
    (name: string, value: string) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set(name, value);
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  const setMonth = useCallback((next: string) => setAddress(MONTH_PARAM, next), [setAddress]);
  const setScope = useCallback((next: Scope) => setAddress(PERSON_PARAM, next), [setAddress]);

  // Settles the question once: a month in the address ends it unchanged; otherwise the answer is
  // used and written to the address, and a failed or empty answer leaves the calendar month.
  useEffect(() => {
    if (!asking) return;
    if (addressHasMonth) {
      setAsking(false);
      return;
    }
    if (latest.isPending) return;
    if (isMonth(latest.data)) {
      setOpeningMonth(latest.data);
      setMonth(latest.data);
    }
    setAsking(false);
  }, [asking, addressHasMonth, latest.isPending, latest.data, setMonth]);

  // A request that never answers must not leave the loading state up for good.
  useEffect(() => {
    if (!asking || addressHasMonth) return;
    const timer = setTimeout(() => setAsking(false), LATEST_MONTH_WAIT_MS);
    return () => clearTimeout(timer);
  }, [asking, addressHasMonth]);

  const value = useMemo(
    () => ({ month, setMonth, monthPending, scope, setScope, lastPersonId }),
    [month, setMonth, monthPending, scope, setScope, lastPersonId],
  );
  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}

export function useView(): ViewState {
  const value = useContext(ViewContext);
  if (!value) throw new Error('useView needs a ViewProvider above it');
  return value;
}

/** The scope value for a subject: 'casa' or the person's id. */
export function subjectScope(subject: Subject): Scope {
  return subject.kind === 'casa' ? HOUSEHOLD : subject.person.id;
}

/** The subject a `SubjectGate` resolved, so links below it name that person, not a stale choice. */
export const SubjectContext = createContext<Subject | null>(null);

/**
 * Turns an address inside the app into one that keeps the month and person on screen.
 * Outside a `ViewProvider` it leaves the address alone, so a part can render alone.
 */
export function useViewPath(): (path: string) => string {
  const view = useContext(ViewContext);
  const subject = useContext(SubjectContext);
  // While the opening month is still being asked, links carry no month: a tap would lock in the calendar month.
  const month = view?.monthPending ? undefined : view?.month;
  const scope = subject ? subjectScope(subject) : view?.scope;
  const known = view !== null;
  return useCallback(
    (path) => (known && scope !== undefined ? withView(path, { month, scope }) : path),
    [known, month, scope],
  );
}

/**
 * Builds a link to Transações that opens on the month and person on screen.
 * A chart column or a person row that stands for another month or person passes it in `view`.
 */
export function useTransacoesLink(): (filters: LinkFilters, view?: { month?: string; scope?: Scope }) => string {
  const { month, scope } = useView();
  const subject = useContext(SubjectContext);
  const shownScope = subject ? subjectScope(subject) : scope;
  return useCallback(
    (filters, view = {}) => transacoesLink({ ...filters, month: view.month ?? month, scope: view.scope ?? shownScope }),
    [month, shownScope],
  );
}

export type Subject =
  | { kind: 'casa'; name: string; color: string }
  | { kind: 'person'; person: Person; name: string; color: string };

const CASA: Subject = { kind: 'casa', name: 'Casa', color: HOUSEHOLD_COLOR };

function personSubject(person: Person): Subject {
  return { kind: 'person', person, name: person.name, color: personColor(person) };
}

/**
 * Whose screen this is. Casa only where the screen offers it. A remembered id
 * that matches nobody falls back to Casa where offered, else to the last
 * person picked, else to the first person, so a screen always has a subject.
 */
export function resolveSubject(
  people: Person[],
  scope: Scope,
  lastPersonId: string | null,
  allowHousehold: boolean,
): Subject | null {
  const byId = (id: string | null) => (id ? people.find((person) => person.id === id) : undefined);
  if (scope === HOUSEHOLD && allowHousehold) return CASA;

  const chosen = scope === HOUSEHOLD ? undefined : byId(scope);
  if (chosen) return personSubject(chosen);
  if (allowHousehold) return CASA;

  const fallback = byId(lastPersonId) ?? people[0];
  return fallback ? personSubject(fallback) : null;
}

export function useSubject({ allowHousehold }: { allowHousehold: boolean }) {
  const { scope, lastPersonId } = useView();
  const peopleQuery = usePeople();
  const people = peopleQuery.data ?? [];
  const subject = peopleQuery.data ? resolveSubject(people, scope, lastPersonId, allowHousehold) : null;
  return { peopleQuery, people, subject };
}

/** The person id to send to the API, or undefined for Casa. */
export function subjectPersonId(subject: Subject | null): string | undefined {
  return subject?.kind === 'person' ? subject.person.id : undefined;
}
