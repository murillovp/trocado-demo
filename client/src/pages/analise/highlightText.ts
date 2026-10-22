import type { AnalysisInsight } from '@/api/types';
import { formatWholeReais, monthSentence, plural } from '@/lib/format';

/**
 * A month inside a sentence: its name alone when it falls in the selected month's year, the name with
 * the year otherwise ("dezembro de 2025"), so a streak that crosses a year stays unambiguous.
 */
function monthInSentence(month: string, selectedMonth: string): string {
  const text = monthSentence(month);
  return month.slice(0, 4) === selectedMonth.slice(0, 4) ? text.slice(0, text.indexOf(' de ')) : text;
}

/**
 * One Destaques sentence written from its data, as the spec words it:
 * "Bares e cafés subiu 2 meses seguidos: de R$ 117 em julho para R$ 378 em setembro." or
 * "Lazer e cultura: R$ 1.105 em setembro, R$ 924 acima da média de 2 meses."
 * Falls read "caiu" and "abaixo". Amounts drop the cents. `selectedMonth` decides which months need a year.
 */
export function insightSentence(insight: AnalysisInsight, selectedMonth: string): string {
  const name = insight.categoryName ?? 'Sem categoria';
  if (insight.kind === 'streak') {
    const verb = insight.direction === 'up' ? 'subiu' : 'caiu';
    const from = `${formatWholeReais(insight.fromCents)} em ${monthInSentence(insight.fromMonth, selectedMonth)}`;
    const to = `${formatWholeReais(insight.toCents)} em ${monthInSentence(insight.toMonth, selectedMonth)}`;
    return `${name} ${verb} ${insight.steps} meses seguidos: de ${from} para ${to}.`;
  }
  const side = insight.direction === 'up' ? 'acima' : 'abaixo';
  const spent = `${formatWholeReais(insight.monthCents)} em ${monthInSentence(insight.month, selectedMonth)}`;
  const gap = formatWholeReais(Math.abs(insight.changeCents));
  return `${name}: ${spent}, ${gap} ${side} da média de ${plural(insight.averagedMonthCount, 'mês', 'meses')}.`;
}

/** The category a sentence stands for, as the `categoria` filter writes it: its id, or 'none' for lines with no category. */
export function insightFilterId(insight: AnalysisInsight): string {
  return insight.categoryId ?? 'none';
}
