import { useAccounts, useBucketLabels, useCategories, useTags } from '@/api/queries';
import type { AnalysisMonthQuery, Person } from '@/api/types';
import { SubjectGate } from '@/app/SubjectGate';
import { subjectPersonId, useView, type Subject } from '@/app/view';
import { ClearFiltersButton } from '@/components/ClearFiltersButton';
import { Segmented } from '@/components/Segmented';
import { ErrorState } from '@/components/States';
import { SubjectHeader } from '@/components/SubjectHeader';
import { accountParams } from '@/lib/accountParams';
import { AnaliseFilters } from './analise/AnaliseFilters';
import { carriedFilters, countAnaliseFilters, useAnaliseFilters } from './analise/useAnaliseFilters';
import { MonthView } from './analise/MonthView';
import { periodRangeLabel, PERIOD_OPTIONS, usePeriod } from './analise/usePeriod';
import { WeekView } from './analise/WeekView';
import { YearView } from './analise/YearView';

export function AnalisePage() {
  return (
    <SubjectGate allowHousehold>
      {(subject, people) => <AnaliseScreen subject={subject} people={people} />}
    </SubjectGate>
  );
}

function AnaliseScreen({ subject, people }: { subject: Subject; people: Person[] }) {
  const { month } = useView();
  const filters = useAnaliseFilters();
  const { period, setPeriod } = usePeriod();
  const { bucket, categoryId, tagId } = filters.values;
  const personId = subjectPersonId(subject);

  const accountsQuery = useAccounts();
  const categoriesQuery = useCategories();
  const tagsQuery = useTags();
  const bucketLabels = useBucketLabels();
  const accounts = accountsQuery.data ?? [];
  const scopedAccounts = personId ? accounts.filter((account) => account.personId === personId) : accounts;
  // An account of the other person, kept in the address, is forgotten when the person changes.
  const accountIds = filters.values.accountIds.filter((id) => scopedAccounts.some((account) => account.id === id));
  const values = { ...filters.values, accountIds };

  // Análise counts spending only, so income categories and the savings group are not offered.
  const spendingCategories = (categoriesQuery.data ?? []).filter(
    (category) => category.appliesTo === 'expense' && category.bucket !== 'savings',
  );
  const isKnownCategory = categoryId === '' || categoryId === 'none' || spendingCategories.some((category) => category.id === categoryId);
  const categoryOptions = [
    { id: '', name: 'Todas as categorias' },
    { id: 'none', name: 'Sem categoria' },
    ...spendingCategories,
    ...(categoriesQuery.data !== undefined && !isKnownCategory ? [{ id: categoryId, name: 'Categoria arquivada' }] : []),
  ];

  // The tag control shows once tags exist (or one is in the address). A server without tags fails the query and hides it.
  const tags = tagsQuery.data;
  const tagOptions =
    tags !== undefined && (tags.length > 0 || tagId !== '')
      ? [...tags, ...(tagId !== '' && !tags.some((tag) => tag.id === tagId) ? [{ id: tagId, name: 'Tag apagada' }] : [])]
      : undefined;

  const activeCount = countAnaliseFilters(values);
  const query: AnalysisMonthQuery = {
    month,
    personId,
    ...accountParams(accountIds),
    bucket,
    categoryId: categoryId || undefined,
    tagId: tagId || undefined,
  };
  const carried = carriedFilters(values);

  return (
    <>
      <SubjectHeader
        subject={subject}
        people={people}
        allowHousehold
        monthText={period === 'mes' ? undefined : periodRangeLabel(month)}
      />
      <Segmented label="Período" value={period} options={PERIOD_OPTIONS} onChange={setPeriod} />
      <AnaliseFilters
        accounts={scopedAccounts}
        accountIds={accountIds}
        onAccounts={filters.setAccountIds}
        bucket={bucket}
        bucketLabels={bucketLabels}
        onBucket={filters.setBucket}
        categoryId={categoryId}
        categoryOptions={categoryOptions}
        onCategory={filters.setCategoryId}
        tagOptions={tagOptions}
        tagId={tagId}
        onTag={filters.setTagId}
        activeCount={activeCount}
        clear={activeCount > 0 ? <ClearFiltersButton count={activeCount} onClear={filters.clear} /> : undefined}
      />
      {accountsQuery.isError ? <ErrorState inline error={accountsQuery.error} onRetry={() => void accountsQuery.refetch()} /> : null}
      {categoriesQuery.isError ? <ErrorState inline error={categoriesQuery.error} onRetry={() => void categoriesQuery.refetch()} /> : null}

      {period === 'ano' ? <YearView query={query} carried={carried} /> : null}
      {period === 'semana' ? <WeekView query={query} carried={carried} /> : null}
      {period === 'mes' ? <MonthView query={query} carried={carried} /> : null}
    </>
  );
}
