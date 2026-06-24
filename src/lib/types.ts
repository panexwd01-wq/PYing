export type JobRecord = Record<string, string> & { __id: string };

export type Lists = Record<string, string[]>;

export interface ApiError {
  error: string;
}
