/** Which of the three demo accounts a line sits on. */
export type AccountKey = 'brunoConta' | 'brunoCartao' | 'marinaConta';

export type Merchant = {
  /** The name the bank prints. */
  vendorName: string;
  /** The readable name the household sees. */
  nickname: string;
  category: string;
  account: AccountKey;
  /** The price range in reais. */
  min: number;
  max: number;
  /** How many times a month the household buys here, as a range. */
  perMonth: readonly [number, number];
  /** Shown with the "IA" mark: the seller rule was written by the AI and nobody has checked it yet. */
  aiGuess?: boolean;
};

/** Everyday purchases that repeat every month with a different price and day. */
export const MERCHANTS: readonly Merchant[] = [
  { vendorName: 'PAO DE ACUCAR 0412', nickname: 'Pão de Açúcar', category: 'Mercado', account: 'brunoCartao', min: 140, max: 420, perMonth: [3, 4] },
  { vendorName: 'MERCADO DIA A DIA', nickname: 'Mercado Dia a Dia', category: 'Mercado', account: 'brunoCartao', min: 60, max: 210, perMonth: [2, 3] },
  { vendorName: 'HORTIFRUTI NATURAL', nickname: 'Hortifruti Natural', category: 'Mercado', account: 'marinaConta', min: 45, max: 130, perMonth: [2, 4] },
  { vendorName: 'IFOOD *RESTAURANTE', nickname: 'iFood', category: 'Delivery', account: 'brunoCartao', min: 38, max: 112, perMonth: [4, 7] },
  { vendorName: 'RAPPI BRASIL', nickname: 'Rappi', category: 'Delivery', account: 'marinaConta', min: 30, max: 85, perMonth: [1, 3] },
  { vendorName: 'OSTERIA DEL MARE', nickname: 'Osteria del Mare', category: 'Restaurantes', account: 'brunoCartao', min: 140, max: 360, perMonth: [1, 2] },
  { vendorName: 'COZINHA DA VILA', nickname: 'Cozinha da Vila', category: 'Restaurantes', account: 'marinaConta', min: 70, max: 190, perMonth: [1, 3] },
  { vendorName: 'PADARIA SANTO GRAO', nickname: 'Padaria Santo Grão', category: 'Bares e cafés', account: 'marinaConta', min: 18, max: 52, perMonth: [3, 6] },
  { vendorName: 'CAFE DO LARGO', nickname: 'Café do Largo', category: 'Bares e cafés', account: 'brunoCartao', min: 14, max: 44, perMonth: [2, 5] },
  { vendorName: 'BAR DO ZE', nickname: 'Bar do Zé', category: 'Bares e cafés', account: 'brunoCartao', min: 80, max: 210, perMonth: [1, 2] },
  { vendorName: 'UBER *TRIP', nickname: 'Uber', category: 'Transporte', account: 'brunoCartao', min: 16, max: 58, perMonth: [4, 8] },
  { vendorName: '99 TAXI', nickname: '99', category: 'Transporte', account: 'marinaConta', min: 14, max: 46, perMonth: [2, 5] },
  { vendorName: 'POSTO IPIRANGA JARDINS', nickname: 'Posto Ipiranga', category: 'Transporte', account: 'brunoCartao', min: 120, max: 240, perMonth: [2, 3] },
  { vendorName: 'DROGARIA SAO PAULO', nickname: 'Drogaria São Paulo', category: 'Saúde e farmácia', account: 'marinaConta', min: 25, max: 160, perMonth: [1, 3] },
  { vendorName: 'CINEMARK SHOPPING', nickname: 'Cinemark', category: 'Lazer e cultura', account: 'brunoCartao', min: 48, max: 130, perMonth: [0, 2] },
  { vendorName: 'SYMPLA INGRESSOS', nickname: 'Sympla', category: 'Lazer e cultura', account: 'marinaConta', min: 60, max: 280, perMonth: [0, 1] },
  { vendorName: 'AMAZON BR MARKETPLACE', nickname: 'Amazon', category: 'Compras', account: 'brunoCartao', min: 40, max: 360, perMonth: [1, 3] },
  { vendorName: 'MERCADOLIVRE*VENDEDOR', nickname: 'Mercado Livre', category: 'Compras', account: 'brunoCartao', min: 35, max: 240, perMonth: [0, 2] },
  { vendorName: 'RENNER 0221', nickname: 'Renner', category: 'Compras', account: 'marinaConta', min: 90, max: 420, perMonth: [0, 1] },
  { vendorName: 'PETZ LOJA JARDINS', nickname: 'Petz', category: 'Pets', account: 'marinaConta', min: 85, max: 230, perMonth: [1, 2] },
  { vendorName: 'STUDIO BELLA HAIR', nickname: 'Studio Bella', category: 'Beleza e cuidados pessoais', account: 'marinaConta', min: 110, max: 260, perMonth: [1, 1] },
  { vendorName: 'BARBEARIA DO CENTRO', nickname: 'Barbearia do Centro', category: 'Beleza e cuidados pessoais', account: 'brunoCartao', min: 55, max: 85, perMonth: [1, 1], aiGuess: true },
  { vendorName: 'LIVRARIA DA TARDE', nickname: 'Livraria da Tarde', category: 'Lazer e cultura', account: 'marinaConta', min: 45, max: 190, perMonth: [0, 1], aiGuess: true },
];

export type FixedBill = {
  vendorName: string;
  nickname: string;
  category: string;
  account: AccountKey;
  day: number;
  /** The price in reais for a month; `monthIndex` is 0 for Nov 2025 and 11 for Oct 2026. */
  amount: (monthIndex: number, noise: number) => number;
  /** First and last month index the bill runs in, both included. */
  from?: number;
  to?: number;
};

/** Bills and subscriptions that come once a month on a set day. */
export const FIXED_BILLS: readonly FixedBill[] = [
  { vendorName: 'IMOBILIARIA VILA REAL', nickname: 'Aluguel', category: 'Moradia', account: 'brunoConta', day: 10, amount: (m) => (m < 3 ? 2800 : 2950) },
  { vendorName: 'CONDOMINIO ED PARQUE VERDE', nickname: 'Condomínio', category: 'Moradia', account: 'brunoConta', day: 10, amount: (_m, n) => 650 + Math.round(n * 40) },
  { vendorName: 'ENEL SP', nickname: 'Energia (Enel)', category: 'Contas de casa', account: 'marinaConta', day: 14, amount: (m, n) => 190 + Math.round(n * 70) + (m === 3 || m === 4 || m === 10 ? 40 : 0) },
  { vendorName: 'SABESP', nickname: 'Água (Sabesp)', category: 'Contas de casa', account: 'marinaConta', day: 16, amount: (_m, n) => 98 + Math.round(n * 24) },
  { vendorName: 'COMGAS', nickname: 'Gás (Comgás)', category: 'Contas de casa', account: 'marinaConta', day: 18, amount: (_m, n) => 54 + Math.round(n * 22) },
  { vendorName: 'VIVO FIBRA', nickname: 'Internet (Vivo)', category: 'Internet e telefone', account: 'brunoConta', day: 8, amount: () => 139.9 },
  { vendorName: 'CLARO MOVEL', nickname: 'Celular (Claro)', category: 'Internet e telefone', account: 'brunoConta', day: 12, amount: () => 94.9 },
  { vendorName: 'TIM CELULAR', nickname: 'Celular (TIM)', category: 'Internet e telefone', account: 'marinaConta', day: 12, amount: () => 69.9 },
  { vendorName: 'AMIL SAUDE', nickname: 'Plano de saúde (Amil)', category: 'Seguros', account: 'marinaConta', day: 7, amount: (m) => (m < 2 ? 640 : 690) },
  { vendorName: 'PORTO SEGURO AUTO', nickname: 'Seguro do carro', category: 'Seguros', account: 'brunoConta', day: 20, amount: () => 312.4 },
  { vendorName: 'PILATES STUDIO MOVE', nickname: 'Pilates', category: 'Saúde e farmácia', account: 'marinaConta', day: 6, amount: () => 420 },
  { vendorName: 'SMART FIT', nickname: 'Academia (Smart Fit)', category: 'Saúde e farmácia', account: 'brunoCartao', day: 9, amount: () => 129.9 },
  { vendorName: 'NETFLIX.COM', nickname: 'Netflix', category: 'Assinaturas', account: 'brunoCartao', day: 3, amount: (m) => (m < 5 ? 55.9 : 59.9) },
  { vendorName: 'SPOTIFY', nickname: 'Spotify', category: 'Assinaturas', account: 'brunoCartao', day: 4, amount: () => 34.9 },
  { vendorName: 'APPLE.COM/BILL', nickname: 'iCloud', category: 'Assinaturas', account: 'brunoCartao', day: 5, amount: () => 14.9 },
  { vendorName: 'DISNEY PLUS', nickname: 'Disney+', category: 'Assinaturas', account: 'marinaConta', day: 11, amount: () => 43.9 },
  { vendorName: 'IPTU PREFEITURA SP', nickname: 'IPTU', category: 'Impostos e taxas', account: 'brunoConta', day: 15, amount: () => 312.6, from: 3, to: 12 },
  { vendorName: 'CULTURA INGLESA', nickname: 'Curso de inglês', category: 'Educação', account: 'marinaConta', day: 9, amount: () => 468, from: 4 },
  { vendorName: 'DIARISTA ROSANGELA', nickname: 'Diarista', category: 'Contas de casa', account: 'brunoConta', day: 17, amount: () => 360 },
];

/** Scales the everyday price ranges per category so a normal month leaves a little money over. */
export const CATEGORY_SCALE: Readonly<Record<string, number>> = {
  Mercado: 0.7,
  Compras: 0.5,
  Transporte: 0.7,
  Restaurantes: 0.8,
  Delivery: 0.8,
};
