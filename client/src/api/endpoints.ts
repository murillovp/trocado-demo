/**
 * One typed function per API endpoint, named as in shared/contract/endpoints.ts.
 * Screens and hooks call these and never write an address or a body by hand.
 * Each function returns the answer exactly as the server sends it; the queries
 * in queries.ts unwrap what a screen needs. A test checks that the names and
 * addresses here match the contract.
 */
import { api, serverOutdatedError, withQuery } from './client';
import type {
  AcceptVendors,
  AcceptVendorsAnswer,
  AccountAnswer,
  AccountsAnswer,
  AnalysisMonthAnswer,
  AnalysisMonthQuery,
  AnalysisTagsAnswer,
  AnalysisTagsQuery,
  AnalysisWeekAnswer,
  AnalysisYearAnswer,
  BatchChange,
  BatchChangeAnswer,
  BudgetQuery,
  BudgetView,
  CategoriesAnswer,
  CategoryAnswer,
  CategoryChangeAnswer,
  CategoryOrder,
  CategoryPatch,
  DetectRequest,
  EditLineResult,
  FileDetection,
  HistoryAnswer,
  HouseholdAnswer,
  HouseholdPatch,
  ImportReview,
  ImportSummaryAnswer,
  ImportUpload,
  ImportsAnswer,
  InstallmentsAnswer,
  IntegrityAnswer,
  LatestMonthAnswer,
  LedgerLineChanges,
  LedgerQuery,
  LineEdit,
  ManualLineInput,
  MonthQuery,
  MonthReport,
  NewAccount,
  NewCategory,
  PeopleAnswer,
  PersonAnswer,
  PersonPatch,
  ReclassifyResult,
  ScreenshotUpload,
  SettingsAnswer,
  SettingsUpdate,
  TagAnswer,
  TagDeletedAnswer,
  TagLines,
  TagLinesAnswer,
  TagsAnswer,
  TransactionAnswer,
  TransactionsAnswer,
  VendorAnswer,
  VendorEdit,
  VendorEditAnswer,
  VendorsAnswer,
} from './types';
import { postWithProgress, type UploadStep } from './upload';

// People and accounts

export const listPeople = (signal?: AbortSignal) => api.get<PeopleAnswer>('/api/people', signal);

export const updatePerson = (id: string, patch: PersonPatch) => api.patch<PersonAnswer>(`/api/people/${id}`, patch);

export const listAccounts = (signal?: AbortSignal) => api.get<AccountsAnswer>('/api/accounts', signal);

export const createAccount = (input: NewAccount) => api.post<AccountAnswer>('/api/accounts', input);

export const renameAccount = (id: string, label: string) => api.patch<AccountAnswer>(`/api/accounts/${id}`, { label });

// Categories and the household

export const listCategories = (signal?: AbortSignal) => api.get<CategoriesAnswer>('/api/categories', signal);

export const createCategory = (input: NewCategory) => api.post<CategoryChangeAnswer>('/api/categories', input);

export const updateCategory = (id: string, patch: CategoryPatch) =>
  api.patch<CategoryChangeAnswer>(`/api/categories/${id}`, patch);

export const archiveCategory = (id: string) => api.delete<CategoryAnswer>(`/api/categories/${id}`);

/** Puts the active categories in the order of `ids`, in one request. */
export const reorderCategories = (order: CategoryOrder) => api.put<CategoriesAnswer>('/api/categories/order', order);

export const getHousehold = (signal?: AbortSignal) => api.get<HouseholdAnswer>('/api/household', signal);

export const updateHousehold = (patch: HouseholdPatch) => api.patch<HouseholdAnswer>('/api/household', patch);

// Imports

export const listImports = (signal?: AbortSignal) => api.get<ImportsAnswer>('/api/imports', signal);

type UploadOptions = { signal?: AbortSignal };

/** Uploads a bank file and reports each step. Keeps `postWithProgress`, the one call that reports upload progress. */
export const uploadImport = (
  body: ImportUpload,
  onStep: (step: UploadStep) => void,
  options?: UploadOptions,
) => postWithProgress<ImportSummaryAnswer>('/api/imports', body, onStep, options);

/** Uploads Swile screenshots and reports each step. */
export const uploadScreenshots = (
  body: ScreenshotUpload,
  onStep: (step: UploadStep) => void,
  options?: UploadOptions,
) => postWithProgress<ImportSummaryAnswer>('/api/imports/screenshots', body, onStep, options);

export const reclassifyImports = () => api.post<ReclassifyResult>('/api/imports/reclassify');

export const detectFile = (fileBase64: DetectRequest['fileBase64']) =>
  api.post<FileDetection>('/api/imports/detect', { fileBase64 });

export const getImportReview = (id: string, signal?: AbortSignal) => api.get<ImportReview>(`/api/imports/${id}`, signal);

/** The address of one saved screenshot. The browser fetches it itself, as an image. */
export const getImportImage = (importId: string, position: number) => `/api/imports/${importId}/images/${position}`;

export const confirmImport = (id: string, edits: LineEdit[]) =>
  api.post<ImportReview>(`/api/imports/${id}/confirm`, { edits });

export const cancelImport = (id: string) => api.delete(`/api/imports/${id}`);

// Reports

export async function getInstallments(signal?: AbortSignal) {
  const answer = await api.get<InstallmentsAnswer>('/api/installments', signal);
  // A server that has not restarted since the forecasts were added answers without them.
  if (!answer.forecast || !answer.forecastByPerson) throw serverOutdatedError(200);
  return answer;
}

export const getIntegrity = (signal?: AbortSignal) => api.get<IntegrityAnswer>('/api/integrity', signal);

export const getLatestMonth = (signal?: AbortSignal) => api.get<LatestMonthAnswer>('/api/months/latest', signal);

export const getMonthReport = (query: MonthQuery, signal?: AbortSignal) =>
  api.get<MonthReport>(withQuery('/api/reports/month', query), signal);

export const getHistory = (query: MonthQuery, signal?: AbortSignal) =>
  api.get<HistoryAnswer>(withQuery('/api/reports/history', query), signal);

export const getBudget = (query: BudgetQuery, signal?: AbortSignal) =>
  api.get<BudgetView>(withQuery('/api/reports/budget', query), signal);

// Análise

export const getAnalysisMonth = (query: AnalysisMonthQuery, signal?: AbortSignal) =>
  api.get<AnalysisMonthAnswer>(withQuery('/api/analysis/month', query), signal);

export const getAnalysisYear = (query: AnalysisMonthQuery, signal?: AbortSignal) =>
  api.get<AnalysisYearAnswer>(withQuery('/api/analysis/year', query), signal);

export const getAnalysisWeek = (query: AnalysisMonthQuery, signal?: AbortSignal) =>
  api.get<AnalysisWeekAnswer>(withQuery('/api/analysis/week', query), signal);

export const getAnalysisTags = (query: AnalysisTagsQuery = {}, signal?: AbortSignal) =>
  api.get<AnalysisTagsAnswer>(withQuery('/api/analysis/tags', query), signal);

// Settings

export const getSettings = (signal?: AbortSignal) => api.get<SettingsAnswer>('/api/settings', signal);

export const saveSettings = (values: SettingsUpdate) => api.put<SettingsAnswer>('/api/settings', values);

// Transações

export async function listTransactions(query: LedgerQuery, signal?: AbortSignal) {
  const path = withQuery('/api/transactions', { ...query });
  // withQuery drops empty-string values, but an empty savingsLabel means "no label" and must reach the server.
  const address = query.savingsLabel === '' ? `${path}${path.includes('?') ? '&' : '?'}savingsLabel=` : path;
  const answer = await api.get<TransactionsAnswer>(address, signal);
  // A server that has not restarted since the totals moved to it answers without them.
  if (!answer.summary) throw serverOutdatedError(200);
  return answer;
}

export const createTransaction = (input: ManualLineInput) => api.post<TransactionAnswer>('/api/transactions', input);

export const updateTransaction = (id: string, changes: LedgerLineChanges) =>
  api.patch<EditLineResult>(`/api/transactions/${id}`, changes);

export const deleteTransaction = (id: string) => api.delete(`/api/transactions/${id}`);

/** Sets one category, or one kind, on every listed line in one request. All of them change, or none. */
export const batchChangeTransactions = (input: BatchChange) => api.post<BatchChangeAnswer>('/api/transactions/batch', input);

// Tags

export const listTags = (signal?: AbortSignal) => api.get<TagsAnswer>('/api/tags', signal);

export const createTag = (name: string) => api.post<TagAnswer>('/api/tags', { name });

export const renameTag = (id: string, name: string) => api.patch<TagAnswer>(`/api/tags/${id}`, { name });

export const deleteTag = (id: string) => api.delete<TagDeletedAnswer>(`/api/tags/${id}`);

/** Adds a tag to, or removes it from, every listed line, in one request. */
export const tagTransactions = (input: TagLines) => api.post<TagLinesAnswer>('/api/transactions/tags', input);

// Sellers

export const listVendors = (signal?: AbortSignal) => api.get<VendorsAnswer>('/api/vendors', signal);

export const updateVendor = (id: string, edit: VendorEdit) => api.patch<VendorEditAnswer>(`/api/vendors/${id}`, edit);

export const acceptVendor = (id: string) => api.post<VendorAnswer>(`/api/vendors/${id}/accept`);

/** Accepts every listed seller's rule as it stands, in one request. */
export const acceptVendors = (input: AcceptVendors) => api.post<AcceptVendorsAnswer>('/api/vendors/accept', input);
