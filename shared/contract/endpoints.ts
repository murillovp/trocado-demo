/**
 * Every API endpoint, once. The key is the name of the browser's function for
 * it (client/src/api/endpoints.ts). `answerKeys` lists the top-level keys of
 * the JSON answer, or is null when the answer is not JSON (a picture, or an
 * empty 204). server/http/contract.test.ts checks this list against the routes
 * and the answers, and the browser's test checks it against its functions.
 */
export type EndpointMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type EndpointSpec = {
  method: EndpointMethod;
  /** The address, with `:name` where the path carries a value. */
  path: string;
  answerKeys: readonly string[] | null;
};

export const ENDPOINTS = {
  listPeople: { method: 'GET', path: '/api/people', answerKeys: ['people'] },
  updatePerson: { method: 'PATCH', path: '/api/people/:id', answerKeys: ['person'] },

  listAccounts: { method: 'GET', path: '/api/accounts', answerKeys: ['accounts'] },
  createAccount: { method: 'POST', path: '/api/accounts', answerKeys: ['account'] },
  renameAccount: { method: 'PATCH', path: '/api/accounts/:id', answerKeys: ['account'] },

  listCategories: { method: 'GET', path: '/api/categories', answerKeys: ['categories'] },
  createCategory: { method: 'POST', path: '/api/categories', answerKeys: ['category', 'linesChanged'] },
  updateCategory: { method: 'PATCH', path: '/api/categories/:id', answerKeys: ['category', 'linesChanged'] },
  archiveCategory: { method: 'DELETE', path: '/api/categories/:id', answerKeys: ['category'] },
  reorderCategories: { method: 'PUT', path: '/api/categories/order', answerKeys: ['categories'] },

  getHousehold: { method: 'GET', path: '/api/household', answerKeys: ['household'] },
  updateHousehold: { method: 'PATCH', path: '/api/household', answerKeys: ['household'] },

  listImports: { method: 'GET', path: '/api/imports', answerKeys: ['imports'] },
  uploadImport: { method: 'POST', path: '/api/imports', answerKeys: ['import'] },
  uploadScreenshots: { method: 'POST', path: '/api/imports/screenshots', answerKeys: ['import'] },
  reclassifyImports: {
    method: 'POST',
    path: '/api/imports/reclassify',
    answerKeys: ['askedCount', 'categorizedCount', 'aiFailed', 'aiFailure'],
  },
  detectFile: { method: 'POST', path: '/api/imports/detect', answerKeys: ['format', 'accountIds'] },
  getImportReview: {
    method: 'GET',
    path: '/api/imports/:id',
    answerKeys: ['import', 'images', 'rows', 'counts', 'lines', 'needsReviewCount'],
  },
  getImportImage: { method: 'GET', path: '/api/imports/:id/images/:position', answerKeys: null },
  confirmImport: {
    method: 'POST',
    path: '/api/imports/:id/confirm',
    answerKeys: ['import', 'images', 'rows', 'counts', 'lines', 'needsReviewCount'],
  },
  cancelImport: { method: 'DELETE', path: '/api/imports/:id', answerKeys: null },

  getInstallments: { method: 'GET', path: '/api/installments', answerKeys: ['plans', 'totalOwedCents', 'owedByPerson', 'forecast', 'forecastByPerson'] },
  getIntegrity: { method: 'GET', path: '/api/integrity', answerKeys: ['problems'] },
  getLatestMonth: { method: 'GET', path: '/api/months/latest', answerKeys: ['month'] },

  getMonthReport: {
    method: 'GET',
    path: '/api/reports/month',
    answerKeys: ['month', 'totals', 'byCategory', 'byAccount', 'byPerson', 'unsetCount'],
  },
  getHistory: { method: 'GET', path: '/api/reports/history', answerKeys: ['months'] },
  getBudget: {
    method: 'GET',
    path: '/api/reports/budget',
    answerKeys: [
      'personId',
      'month',
      'actualIncomeCents',
      'referenceIncomeCents',
      'baseIncomeCents',
      'buckets',
      'unclassified',
      'history',
    ],
  },

  getAnalysisMonth: {
    method: 'GET',
    path: '/api/analysis/month',
    answerKeys: ['month', 'heading', 'categories', 'newSellers', 'unusual', 'calendar', 'leftOutInstallmentsCents', 'tags'],
  },
  getAnalysisYear: {
    method: 'GET',
    path: '/api/analysis/year',
    answerKeys: ['month', 'columns', 'countedMonths', 'categories', 'insights'],
  },
  getAnalysisWeek: {
    method: 'GET',
    path: '/api/analysis/week',
    answerKeys: ['month', 'countedMonths', 'weekdays', 'monthParts', 'leftOutInstallmentsCents'],
  },
  getAnalysisTags: { method: 'GET', path: '/api/analysis/tags', answerKeys: ['tags', 'detail'] },

  getSettings: { method: 'GET', path: '/api/settings', answerKeys: ['settings'] },
  saveSettings: { method: 'PUT', path: '/api/settings', answerKeys: ['settings'] },

  listTransactions: { method: 'GET', path: '/api/transactions', answerKeys: ['transactions', 'summary'] },
  createTransaction: { method: 'POST', path: '/api/transactions', answerKeys: ['transaction'] },
  updateTransaction: { method: 'PATCH', path: '/api/transactions/:id', answerKeys: ['transaction', 'vendorLinesMoved'] },
  deleteTransaction: { method: 'DELETE', path: '/api/transactions/:id', answerKeys: null },
  batchChangeTransactions: { method: 'POST', path: '/api/transactions/batch', answerKeys: ['changed'] },

  listTags: { method: 'GET', path: '/api/tags', answerKeys: ['tags'] },
  createTag: { method: 'POST', path: '/api/tags', answerKeys: ['tag'] },
  renameTag: { method: 'PATCH', path: '/api/tags/:id', answerKeys: ['tag'] },
  deleteTag: { method: 'DELETE', path: '/api/tags/:id', answerKeys: ['linesUntagged'] },
  tagTransactions: { method: 'POST', path: '/api/transactions/tags', answerKeys: ['changed'] },

  listVendors: { method: 'GET', path: '/api/vendors', answerKeys: ['vendors'] },
  updateVendor: { method: 'PATCH', path: '/api/vendors/:id', answerKeys: ['vendor', 'linesUpdated', 'linesSkipped'] },
  acceptVendor: { method: 'POST', path: '/api/vendors/:id/accept', answerKeys: ['vendor'] },
  acceptVendors: { method: 'POST', path: '/api/vendors/accept', answerKeys: ['accepted'] },
} as const satisfies Record<string, EndpointSpec>;

export type EndpointName = keyof typeof ENDPOINTS;
