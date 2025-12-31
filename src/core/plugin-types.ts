import { z } from 'zod';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { ToolResponse } from '../types/common.ts';

export interface PluginMeta {
  readonly name: string; // Verb used by MCP
  readonly schema: Record<string, z.ZodTypeAny>; // Zod validation schema (object schema)
  readonly description?: string; // One-liner shown in help
  readonly annotations?: ToolAnnotations; // MCP tool annotations for LLM behavior hints
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
