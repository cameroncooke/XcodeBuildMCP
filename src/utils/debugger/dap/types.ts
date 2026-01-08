export type DapRequest<C = unknown> = {
  seq: number;
  type: 'request';
  command: string;
  arguments?: C;
};

export type DapResponse<B = unknown> = {
  seq: number;
  type: 'response';
  request_seq: number;
  success: boolean;
  command: string;
  message?: string;
  body?: B;
};

export type DapEvent<B = unknown> = {
  seq: number;
  type: 'event';
  event: string;
  body?: B;
};

export type InitializeResponseBody = {
  supportsConfigurationDoneRequest?: boolean;
  supportsFunctionBreakpoints?: boolean;
  supportsConditionalBreakpoints?: boolean;
  supportsEvaluateForHovers?: boolean;
  supportsTerminateRequest?: boolean;
};

export type ThreadsResponseBody = {
  threads: Array<{ id: number; name?: string }>;
};

export type StackTraceResponseBody = {
  stackFrames: Array<{
    id: number;
    name: string;
    source?: { path?: string; name?: string };
    line?: number;
    column?: number;
  }>;
  totalFrames?: number;
};

export type ScopesResponseBody = {
  scopes: Array<{ name: string; variablesReference: number; expensive?: boolean }>;
};

export type VariablesResponseBody = {
  variables: Array<{
    name: string;
    value: string;
    type?: string;
    variablesReference?: number;
  }>;
};

export type SetBreakpointsResponseBody = {
  breakpoints: Array<{
    id?: number;
    verified?: boolean;
    message?: string;
    source?: { path?: string; name?: string };
    line?: number;
  }>;
};

export type EvaluateResponseBody = {
  result?: string;
  output?: string;
  type?: string;
  variablesReference?: number;
};

export type StoppedEventBody = {
  reason: string;
  threadId?: number;
  allThreadsStopped?: boolean;
  description?: string;
};

export type OutputEventBody = {
  category?: string;
  output: string;
  data?: unknown;
};

export type TerminatedEventBody = Record<string, never>;
