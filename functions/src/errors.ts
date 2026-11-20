export type FunctionErrorCode =
  | 'unauthenticated'
  | 'permission-denied'
  | 'invalid-argument'
  | 'not-found'
  | 'failed-precondition'
  | 'resource-exhausted';

export class FunctionActionError extends Error {
  public readonly code: FunctionErrorCode;

  constructor(code: FunctionErrorCode, message: string) {
    super(message);
    this.name = 'FunctionActionError';
    this.code = code;
  }
}

export interface DocSnapLike<T = any> {
  readonly exists: boolean;
  readonly id?: string;
  readonly ref?: DocRefLike<T>;
  data(): T | undefined;
}

export interface QuerySnapLike<T = any> {
  readonly docs: Array<DocSnapLike<T> & { readonly ref: DocRefLike<T>; readonly id: string }>;
}

export interface DocRefLike<T = any> {
  readonly id: string;
  collection(path: string): CollectionRefLike;
  get(): Promise<DocSnapLike<T>>;
}

export interface QueryRefLike<T = any> {
  where(field: string, op: string, value: any): QueryRefLike<T>;
  limit(n: number): { get(): Promise<QuerySnapLike<T>> };
  get(): Promise<QuerySnapLike<T>>;
}

export interface CollectionRefLike<T = any> extends QueryRefLike<T> {
  doc(id?: string): DocRefLike<T>;
}

export interface TxLike {
  get(ref: any): Promise<DocSnapLike>;
  getAll(...refs: any[]): Promise<DocSnapLike[]>;
  set(ref: any, data: any): any;
  update(ref: any, data: any): any;
  delete(ref: any): any;
}

export interface DbLike {
  collection(path: string): CollectionRefLike;
  runTransaction<T>(fn: (tx: TxLike) => Promise<T>): Promise<T>;
  batch(): {
    delete(ref: any): any;
    commit(): Promise<any>;
  };
}
