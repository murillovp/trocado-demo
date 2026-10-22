import { CreditCard } from 'lucide-react';
import { useInstallments } from '@/api/queries';
import type { OpenInstallments } from '@/api/types';
import { CardLink } from '@/components/CardLink';
import { Money } from '@/components/Money';
import { QueryView } from '@/components/QueryView';
import { plural } from '@/lib/format';

/** What is still owed on installment plans, for the household or one person, as a muted strip that opens Parcelas. */
export function InstallmentsCard({ personId }: { personId?: string }) {
  const installments = useInstallments();
  return (
    <QueryView query={installments} loading={null} className="contents">
      {(data) => <InstallmentsLink data={data} personId={personId} />}
    </QueryView>
  );
}

function InstallmentsLink({ data, personId }: { data: OpenInstallments; personId?: string }) {
  const { plans, totalOwedCents, owedByPerson } = data;
  const shown = personId ? plans.filter((plan) => plan.personId === personId) : plans;
  const owed = personId
    ? (owedByPerson.find((entry) => entry.personId === personId)?.owedCents ?? 0)
    : totalOwedCents;

  return (
    <CardLink to="/transacoes/parcelas" className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-muted px-4 py-2.5 text-sm shadow-none">
      <CreditCard aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">Parcelas em aberto</span>
      <Money cents={owed} tone="plain" align="start" className="font-semibold" />
      <span className="text-muted-foreground">falta pagar · {plural(shown.length, 'parcelamento', 'parcelamentos')}</span>
      <span className="ml-auto font-medium">Ver parcelas →</span>
    </CardLink>
  );
}
