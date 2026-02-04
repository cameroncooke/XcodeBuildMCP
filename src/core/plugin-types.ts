import * as z from 'zod';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { ToolResponse } from '../types/common.ts';

export type ToolSchemaShape = Record<string, z.ZodType>;

export interface PluginCliMeta {
  /** Optional override of derived CLI name */
  readonly name?: string;
  /** Full schema shape for CLI flag generation (legacy, includes session-managed fields) */
  readonly schema?: ToolSchemaShape;
  /** Mark tool as requiring daemon routing */
  readonly stateful?: boolean;
  /** Prefer daemon routing when available (without forcing auto-start) */
  readonly daemonAffinity?: 'preferred' | 'required';
}

export interface PluginMeta {
  readonly name: string; // Verb used by MCP
  readonly schema: ToolSchemaShape; // Zod validation schema (object schema)
  readonly description?: string; // One-liner shown in help
  readonly annotations?: ToolAnnotations; // MCP tool annotations for LLM behavior hints
  readonly cli?: PluginCliMeta; // CLI-specific metadata (optional)
  handler(params: Record<string, unknown>): Promise<ToolResponse>;
}

export interface WorkflowMeta {
  readonly name: string;
  readonly description: string;
}

export interface WorkflowGroup {
  readonly workflow: WorkflowMeta;
  readonly tools: PluginMeta[];
  readonly directoryName: string;
}

export const defineTool = (meta: PluginMeta): PluginMeta => meta;
