import { ArrowUpRight } from 'lucide-react';
import type { Totals, TransactionKind } from '@/api/types';
import { useTransacoesLink } from '@/app/view';
import { CardLink } from '@/components/CardLink';
import { Money } from '@/components/Money';
import { SectionCard } from '@/components/SectionCard';
import { TextLink } from '@/components/TextLink';
import { plural } from '@/lib/format';
import type { MoneyTone } from '@/lib/moneyTone';
import { cn } from '@/lib/utils';

/** Entradas green, Poupança blue, Gastos plain; Saldo do mês turns a red made for its dark card when the month ended in the red. */
function resultTone(cents: number): MoneyTone {
  return cents < 0 ? 'negative-on-dark' : 'plain';
}

const CARDS: { label: string; key: keyof Totals; kind?: TransactionKind }[] = [
  { label: 'Entradas', key: 'incomeCents', kind: 'income' },
  { label: 'Gastos', key: 'spendingCents', kind: 'expense' },
  { label: 'Poupança', key: 'savingsCents', kind: 'savings' },
  { label: 'Saldo do mês', key: 'resultCents' },
];

/** A five-digit amount does not fit a 132 px card at the full figure size, so phones step it down. */
const FIGURE_FIT = 'text-xl sm:text-figure';

export function TotalsCards({ totals, unsetCount }: { totals: Totals; unsetCount: number }) {
  const linkTo = useTransacoesLink();
  return (
    <>
      <section aria-label="Resumo do mês" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CARDS.map((card) =>
          card.kind ? (
            <CardLink
              key={card.key}
              to={linkTo({ kind: card.kind })}
              aria-label={`Ver lançamentos de ${card.label}`}
              className="group flex flex-col gap-1 p-4"
            >
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {card.label}
                <ArrowUpRight className="size-3.5 transition-colors group-hover:text-foreground" />
              </span>
              <Money cents={totals[card.key]} kind={card.kind} size="figure" align="start" className={FIGURE_FIT} />
            </CardLink>
          ) : (
            <SectionCard key={card.key} variant="compact" className="border-result-card bg-result-card text-result-card-foreground">
              <span className="text-xs text-result-card-muted">{card.label}</span>
              {/* The light figure is the plain colour; a negative one takes its tone instead. */}
              <Money
                cents={totals[card.key]}
                tone={resultTone(totals[card.key])}
                size="figure"
                align="start"
                className={cn(FIGURE_FIT, totals[card.key] >= 0 && 'text-result-card-foreground')}
              />
              <span className="text-xs text-result-card-muted">Entradas − Gastos − Poupança</span>
            </SectionCard>
          ),
        )}
      </section>
      {unsetCount > 0 ? (
        <p className="text-sm">
          {plural(unsetCount, 'lançamento sem tipo ficou', 'lançamentos sem tipo ficaram')} fora dos totais.{' '}
          <TextLink to={linkTo({ kind: 'unset' })} className="font-medium">
            Escolher o tipo
          </TextLink>
        </p>
      ) : null}
    </>
  );
}
