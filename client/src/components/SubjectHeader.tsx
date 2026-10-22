import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { addMonthsToMonth } from '../../../shared/dates';
import { useAccounts } from '@/api/queries';
import type { Person } from '@/api/types';
import { HOUSEHOLD, useView, type Subject } from '@/app/view';
import { IconButton } from '@/components/IconButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HOUSEHOLD_COLOR, personColor } from '@/lib/colors';
import { monthLabel } from '@/lib/format';
import { PersonDisc } from './PersonDisc';

type Props = {
  subject: Subject;
  people: Person[];
  /** Offer Casa in the menu. False on Orçamento (ADR-0004). */
  allowHousehold: boolean;
  /** Parcelas looks forward, so it hides the month stepper. */
  showMonth?: boolean;
  /** Anything that sits between the name and the month, such as a total. */
  aside?: ReactNode;
  /** Words shown between the month arrows instead of the month's name, for a view that spans several months. */
  monthText?: string;
};

/** The line that opens every data screen: whose numbers these are, then which month. */
export function SubjectHeader({ subject, people, allowHousehold, showMonth = true, aside, monthText }: Props) {
  const { month, setMonth, setScope } = useView();
  const accounts = useAccounts().data ?? [];
  const currentKey = subject.kind === 'casa' ? HOUSEHOLD : subject.person.id;

  const options = [
    ...(allowHousehold
      ? [{ key: HOUSEHOLD, name: 'Casa', detail: 'Todo mundo junto', color: HOUSEHOLD_COLOR, household: true }]
      : []),
    ...people.map((person) => ({
      key: person.id,
      name: person.name,
      detail: accounts
        .filter((account) => account.personId === person.id)
        .map((account) => account.label)
        .join(' · '),
      color: personColor(person),
      household: false,
    })),
  ];

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <PersonDisc name={subject.name} color={subject.color} household={subject.kind === 'casa'} size="lg" />
        <h1 className="text-3xl font-semibold tracking-tight">{subject.name}</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label="Trocar de pessoa">
              <ChevronDown aria-hidden="true" />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {options.map((option) => (
              <DropdownMenuItem key={option.key} onSelect={() => setScope(option.key)} className="gap-3 py-2">
                <PersonDisc name={option.name} color={option.color} household={option.household} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{option.name}</span>
                  <span title={option.detail} className="truncate text-xs text-muted-foreground">{option.detail}</span>
                </span>
                {option.key === currentKey ? <Check aria-hidden="true" className="size-4" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {aside}
        {showMonth ? (
          <div className="flex items-center gap-1">
            <IconButton label="Mês anterior" variant="outline" onClick={() => setMonth(addMonthsToMonth(month, -1))}>
              <ChevronLeft aria-hidden="true" />
            </IconButton>
            <span className="min-w-36 text-center text-sm font-medium" aria-live="polite">
              {monthText ?? monthLabel(month)}
            </span>
            <IconButton label="Próximo mês" variant="outline" onClick={() => setMonth(addMonthsToMonth(month, 1))}>
              <ChevronRight aria-hidden="true" />
            </IconButton>
          </div>
        ) : null}
      </div>
    </header>
  );
}
