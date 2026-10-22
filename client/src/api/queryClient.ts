import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './client';

/** One retry, and only when the server could not be reached. Any answer from the server will not change on a retry. */
export function retryAfterNetworkFailure(failureCount: number, error: Error): boolean {
  return error instanceof ApiError && error.code === 'network' && failureCount < 1;
}

/** The query client the app and the test helper share. Mutations never retry. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: retryAfterNetworkFailure },
      mutations: { retry: false },
    },
  });
}
