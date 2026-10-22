/**
 * The API's shapes, taken from the shared contract so the browser and the
 * server can never drift apart: the answer types and the request types
 * (`z.input` of the request schemas). Type-only: nothing from the server and
 * no schema library reaches the browser bundle. This is the only client file
 * allowed to point into shared/contract or server/ (see boundary.test.ts).
 */
export type * from '../../../shared/types';
export type * from '../../../shared/contract/answers';
export type * from '../../../shared/contract/entities';
export type * from '../../../shared/contract/imports';
export type * from '../../../shared/contract/lines';
export type * from '../../../shared/contract/reports';
export type * from '../../../shared/contract/requests';
