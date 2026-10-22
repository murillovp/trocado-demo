import { createRandom, type Random } from './random';
import { CATEGORY_SCALE, FIXED_BILLS, MERCHANTS, type AccountKey } from './catalog';

export const TAG_LISBOA = 'Lisboa 2026';
export const TAG_BUZIOS = 'Férias Búzios';
export const TAG_BIRTHDAY = 'Aniversário da Marina';
export const TAG_NAMES = [TAG_LISBOA, TAG_BUZIOS, TAG_BIRTHDAY] as const;

export type DraftKind = 'expense' | 'income' | 'savings' | 'transfer';

/** One bank line before it is written to the database. `cents` is signed: money out is negative. */
export type Draft = {
  account: AccountKey;
  date: string;
  cents: number;
  vendorName: string;
  nickname: string;
  category: string | null;
  kind: DraftKind;
  savingsLabel?: string;
  tags?: readonly string[];
  /** The two halves of one transfer share this. */
  pairKey?: string;
  aiGuess?: boolean;
  installment?: { plan: string; number: number; total: number };
};

export type DemoMonth = { index: number; year: number; month: number; lastDay: number };

/** Nov 2025 to Oct 2026. The demo "today" is 22 Oct 2026, so the last month stops there. */
export const DEMO_TODAY = { year: 2026, month: 10, day: 22 };
export const MONTH_COUNT = 12;

export function demoMonths(): DemoMonth[] {
  return Array.from({ length: MONTH_COUNT }, (_, index) => {
    const year = 2025 + Math.floor((10 + index) / 12);
    const month = ((10 + index) % 12) + 1;
    const isLast = year === DEMO_TODAY.year && month === DEMO_TODAY.month;
    return { index, year, month, lastDay: isLast ? DEMO_TODAY.day : new Date(year, month, 0).getDate() };
  });
}

export function isoDate(m: DemoMonth, day: number): string {
  return `${m.year}-${String(m.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const reais = (value: number) => Math.round(value * 100);

type Context = { rng: Random; push: (draft: Draft | null) => void; month: DemoMonth };

function at(ctx: Context, day: number): number | null {
  return day <= ctx.month.lastDay ? day : null;
}

function addFixedBills(ctx: Context): void {
  for (const bill of FIXED_BILLS) {
    const { index } = ctx.month;
    if ((bill.from ?? 0) > index || (bill.to ?? 99) < index) continue;
    const noise = ctx.rng.next();
    const day = at(ctx, bill.day);
    if (day === null) continue;
    ctx.push({
      account: bill.account,
      date: isoDate(ctx.month, day),
      cents: -reais(bill.amount(index, noise)),
      vendorName: bill.vendorName,
      nickname: bill.nickname,
      category: bill.category,
      kind: 'expense',
    });
  }
}

function addEverydaySpending(ctx: Context): void {
  const { rng, month } = ctx;
  for (const merchant of MERCHANTS) {
    const times = rng.int(merchant.perMonth[0], merchant.perMonth[1]);
    for (let i = 0; i < times; i += 1) {
      const day = rng.int(1, month.lastDay);
      // December and the weekend before holidays run a little higher.
      const holiday = (month.month === 12 ? 1.18 : 1) * (CATEGORY_SCALE[merchant.category] ?? 1);
      ctx.push({
        account: merchant.account,
        date: isoDate(month, day),
        cents: -Math.round(rng.cents(merchant.min, merchant.max) * holiday),
        vendorName: merchant.vendorName,
        nickname: merchant.nickname,
        category: merchant.category,
        kind: 'expense',
        aiGuess: merchant.aiGuess,
      });
    }
  }
}

function addIncomeAndSavings(ctx: Context): void {
  const { rng, month } = ctx;
  const brunoSalary = month.index < 2 ? 9200 : 10000;
  const marinaSalary = month.index < 4 ? 7600 : 8400;
  const income = (account: AccountKey, day: number, cents: number, vendorName: string, nickname: string, category: string) => {
    const when = at(ctx, day);
    if (when === null) return;
    ctx.push({ account, date: isoDate(month, when), cents, vendorName, nickname, category, kind: 'income' });
  };
  income('brunoConta', 5, reais(brunoSalary), 'EMPRESA ALFA TECNOLOGIA LTDA', 'Salário (Alfa)', 'Salário');
  income('marinaConta', 5, reais(marinaSalary), 'STUDIO MERIDIANO DESIGN', 'Salário (Meridiano)', 'Salário');
  income('brunoConta', 28, rng.cents(42, 96), 'RENDIMENTO CDB NUBANK', 'Rendimento (Nubank)', 'Rendimentos');
  if (month.index === 1) {
    income('brunoConta', 12, reais(6000), 'EMPRESA ALFA TECNOLOGIA LTDA', 'Bônus (Alfa)', 'Bônus');
    income('marinaConta', 10, reais(3600), 'STUDIO MERIDIANO DESIGN', '13º (Meridiano)', 'Bônus');
  }
  if (month.index === 3) income('brunoConta', 19, reais(320), 'REEMBOLSO EMPRESA ALFA', 'Reembolso (Alfa)', 'Reembolso');
  if (month.index === 6) income('brunoConta', 21, reais(215), 'REEMBOLSO EMPRESA ALFA', 'Reembolso (Alfa)', 'Reembolso');
  if (month.index === 10) income('marinaConta', 18, reais(1800), 'PROJETO FREELA CLIENTE BETA', 'Freela (Cliente Beta)', 'Outras entradas');

  const save = (account: AccountKey, vendorName: string, nickname: string, label: string, value: number) => {
    const when = at(ctx, 6);
    if (when === null) return;
    ctx.push({ account, date: isoDate(month, when), cents: -reais(value), vendorName, nickname, category: null, kind: 'savings', savingsLabel: label });
  };
  save('brunoConta', 'APLICACAO TESOURO SELIC', 'Tesouro Selic', 'Reserva de emergência', 1200);
  save('marinaConta', 'APLICACAO CDB ITAU', 'CDB Itaú', 'Casa própria', 800);

  const when = at(ctx, 6);
  if (when !== null) {
    const date = isoDate(month, when);
    const pairKey = `pix-${month.index}`;
    ctx.push({ account: 'brunoConta', date, cents: -reais(1500), vendorName: 'PIX ENVIADO MARINA', nickname: 'Pix para Marina', category: null, kind: 'transfer', pairKey });
    ctx.push({ account: 'marinaConta', date, cents: reais(1500), vendorName: 'PIX RECEBIDO BRUNO', nickname: 'Pix de Bruno', category: null, kind: 'transfer', pairKey });
  }
}

function addOneOffs(ctx: Context): void {
  const { rng, month } = ctx;
  const spend = (account: AccountKey, day: number, value: number, vendorName: string, nickname: string, category: string, tags?: readonly string[]) => {
    const when = at(ctx, day);
    if (when === null) return;
    ctx.push({ account, date: isoDate(month, when), cents: -reais(value), vendorName, nickname, category, kind: 'expense', tags });
  };
  switch (month.index) {
    case 1:
      for (const [vendorName, nickname] of [['AMERICANAS PRESENTES', 'Americanas'], ['LOJA BRINQUEDOS SP', 'Loja de brinquedos'], ['ZARA JARDINS', 'Zara'], ['SEPHORA IGUATEMI', 'Sephora']] as const) {
        spend(rng.pick(['brunoCartao', 'marinaConta'] as const), rng.int(10, 22), rng.int(90, 320), vendorName, nickname, 'Presentes');
      }
      spend('brunoCartao', 24, 640, 'RESTAURANTE CEIA DE NATAL', 'Ceia de Natal', 'Restaurantes');
      break;
    case 2:
      spend('brunoConta', 15, 2150, 'DETRAN SP IPVA', 'IPVA', 'Impostos e taxas');
      break;
    case 4: {
      const trip = [TAG_LISBOA];
      spend('brunoCartao', 10, 3900, 'BOOKING.COM LISBOA', 'Hotel em Lisboa', 'Viagens', trip);
      spend('brunoConta', 5, 280, 'ASSIST CARD SEGURO VIAGEM', 'Seguro viagem', 'Seguros', trip);
      const places = ['TASCA DO CHICO', 'TIME OUT MARKET', 'PASTEIS DE BELEM', 'CERVEJARIA RAMIRO', 'A GINJINHA', 'MERCEARIA LISBOA'];
      places.forEach((place, i) => {
        spend('brunoCartao', 12 + i * 2, rng.int(48, 190), place, place.charAt(0) + place.slice(1).toLowerCase(), 'Restaurantes', trip);
      });
      spend('brunoCartao', 14, rng.int(35, 70), 'BOLT LISBOA', 'Bolt (Lisboa)', 'Transporte', trip);
      spend('brunoCartao', 17, rng.int(35, 80), 'BOLT LISBOA', 'Bolt (Lisboa)', 'Transporte', trip);
      spend('brunoCartao', 19, 460, 'FNAC CHIADO', 'Fnac Chiado', 'Compras', trip);
      spend('brunoCartao', 20, 310, 'LOJA SOUVENIR ALFAMA', 'Souvenirs (Alfama)', 'Presentes', trip);
      break;
    }
    case 5:
      spend('marinaConta', 11, 420, 'CLINICA VET AMIGO FIEL', 'Veterinário (Amigo Fiel)', 'Pets');
      break;
    case 6:
      spend('brunoCartao', 9, 180, 'FLORICULTURA ROSA BRANCA', 'Floricultura Rosa Branca', 'Presentes');
      spend('marinaConta', 8, 290, 'BOTICARIO PERFUMARIA', 'O Boticário', 'Presentes');
      break;
    case 7:
      spend('brunoCartao', 4, 650, 'CLINICA ODONTO SORRISO', 'Dentista (Sorriso)', 'Saúde e farmácia');
      break;
    case 8: {
      const trip = [TAG_BUZIOS];
      spend('brunoCartao', 5, 2350, 'POUSADA MARE ALTA BUZIOS', 'Pousada Maré Alta', 'Viagens', trip);
      spend('brunoCartao', 6, 214, 'RESTAURANTE PEIXE FRESCO', 'Peixe Fresco', 'Restaurantes', trip);
      spend('marinaConta', 7, 168, 'BAR DA PRAIA BUZIOS', 'Bar da Praia', 'Bares e cafés', trip);
      spend('brunoCartao', 8, 296, 'RESTAURANTE SOL E MAR', 'Sol e Mar', 'Restaurantes', trip);
      break;
    }
    case 9: {
      const birthday = [TAG_BIRTHDAY];
      spend('brunoCartao', 15, 520, 'RESTAURANTE MAISON', 'Maison', 'Restaurantes', birthday);
      spend('brunoCartao', 14, 690, 'JOALHERIA VIVARA', 'Vivara', 'Presentes', birthday);
      break;
    }
    default:
      break;
  }
}

export type InstallmentPlanSpec = {
  key: string;
  vendorName: string;
  nickname: string;
  category: string;
  total: number;
  cents: number;
  firstMonthIndex: number;
  day: number;
  tags?: readonly string[];
};

export const INSTALLMENT_PLANS: readonly InstallmentPlanSpec[] = [
  { key: 'sofa', vendorName: 'TOK STOK SOFA', nickname: 'Sofá (Tok&Stok)', category: 'Compras', total: 10, cents: reais(420), firstMonthIndex: 0, day: 12 },
  { key: 'passagens', vendorName: 'TAP AIR PORTUGAL', nickname: 'Passagens Lisboa (TAP)', category: 'Viagens', total: 6, cents: reais(1180), firstMonthIndex: 2, day: 8, tags: [TAG_LISBOA] },
  { key: 'iphone', vendorName: 'APPLE STORE BR', nickname: 'iPhone (Apple)', category: 'Compras', total: 12, cents: reais(549.9), firstMonthIndex: 2, day: 20 },
  { key: 'geladeira', vendorName: 'BRASTEMP GELADEIRA', nickname: 'Geladeira (Brastemp)', category: 'Compras', total: 10, cents: reais(389.9), firstMonthIndex: 7, day: 15 },
];

function addInstallments(ctx: Context): void {
  for (const plan of INSTALLMENT_PLANS) {
    const number = ctx.month.index - plan.firstMonthIndex + 1;
    if (number < 1 || number > plan.total) continue;
    const day = at(ctx, plan.day);
    if (day === null) continue;
    ctx.push({
      account: 'brunoCartao',
      date: isoDate(ctx.month, day),
      cents: -plan.cents,
      vendorName: plan.vendorName,
      nickname: plan.nickname,
      category: plan.category,
      kind: 'expense',
      tags: plan.tags,
      installment: { plan: plan.key, number, total: plan.total },
    });
  }
}

/** Every line of the demo year, in date order. The same seed always gives the same year. */
export function buildDrafts(seed = 2026): Draft[] {
  const rng = createRandom(seed);
  const drafts: Draft[] = [];
  for (const month of demoMonths()) {
    const ctx: Context = { rng, month, push: (draft) => draft && drafts.push(draft) };
    addFixedBills(ctx);
    addEverydaySpending(ctx);
    addIncomeAndSavings(ctx);
    addOneOffs(ctx);
    addInstallments(ctx);
  }
  return drafts.sort((a, b) => a.date.localeCompare(b.date));
}
