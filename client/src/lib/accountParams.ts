/**
 * The account filter of a request. Several accounts go as `accountIds`. With exactly one, the old
 * `accountId` goes too: a server that has not restarted since `accountIds` arrived drops what it does
 * not know, and would list every account while the screen shows one chosen. A current server needs
 * a line to match both, which is the same one account.
 */
export function accountParams(ids: readonly string[]): { accountIds?: string; accountId?: string } {
  if (ids.length === 0) return {};
  if (ids.length === 1) return { accountIds: ids[0], accountId: ids[0] };
  return { accountIds: ids.join(',') };
}
