/**
 * The file name of one saved server answer in the demo. The build script and the
 * browser both call this, so a request and its file always agree. Only the
 * address and its non-empty query parameters count, in alphabetical order.
 */
export function snapshotName(path: string, params: URLSearchParams): string {
  const query = [...params.entries()]
    .filter(([, value]) => value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}~${value}`)
    .join('.');
  const base = path.replace(/^\/api\//, '').replace(/\/+$/, '').replace(/\//g, '_');
  const raw = query ? `${base}__${query}` : base;
  return `${raw.replace(/[^A-Za-z0-9_.~-]/g, '_')}.json`;
}

/** The address and parameters of a request path such as `/api/reports/month?month=2026-10`. */
export function splitRequestPath(requestPath: string): { path: string; params: URLSearchParams } {
  const [path = '', search = ''] = requestPath.split('?');
  return { path, params: new URLSearchParams(search) };
}
