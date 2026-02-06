import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { ToolResponse } from '../types/common.ts';

export const DAEMON_PROTOCOL_VERSION = 1 as const;

export type DaemonMethod =
  | 'daemon.status'
  | 'daemon.stop'
  | 'tool.list'
  | 'tool.invoke'
  | 'xcode-ide.list'
  | 'xcode-ide.invoke';

export interface DaemonRequest<TParams = unknown> {
  v: typeof DAEMON_PROTOCOL_VERSION;
  id: string;
  method: DaemonMethod;
  params?: TParams;
}

export type DaemonErrorCode =
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'AMBIGUOUS_TOOL'
  | 'TOOL_FAILED'
  | 'INTERNAL';

export interface DaemonError {
  code: DaemonErrorCode;
  message: string;
  data?: unknown;
}

export interface DaemonResponse<TResult = unknown> {
  v: typeof DAEMON_PROTOCOL_VERSION;
  id: string;
  result?: TResult;
  error?: DaemonError;
}

export interface ToolInvokeParams {
  tool: string;
  args: Record<string, unknown>;
}

export interface ToolInvokeResult {
  response: ToolResponse;
}

export interface DaemonStatusResult {
  pid: number;
  socketPath: string;
  logPath?: string;
  startedAt: string;
  enabledWorkflows: string[];
  toolCount: number;
  /** Workspace root this daemon is serving */
  workspaceRoot: string;
  /** Short hash key identifying this workspace */
  workspaceKey: string;
}

export interface ToolListItem {
  name: string;
  workflow: string;
  description: string;
  stateful: boolean;
}

export interface XcodeIdeListParams {
  refresh?: boolean;
  /** Trigger a background refresh while still returning cached tools immediately. */
  prefetch?: boolean;
}

export interface XcodeIdeToolListItem {
  remoteName: string;
  localName: string;
  description: string;
  inputSchema?: unknown;
  annotations?: ToolAnnotations;
}

export interface XcodeIdeListResult {
  tools: XcodeIdeToolListItem[];
}

export interface XcodeIdeInvokeParams {
  remoteTool: string;
  args: Record<string, unknown>;
}

export interface XcodeIdeInvokeResult {
  response: unknown;
}
