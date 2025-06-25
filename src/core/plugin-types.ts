import { z } from 'zod';
import { ToolResponse } from '../types/common.js';

export interface PluginMeta {
  readonly name: string; // Verb used by MCP
  readonly schema: Record<string, z.ZodTypeAny>; // Zod validation schema (object schema)
  readonly description?: string; // One-liner shown in help
  handler(params: Record<string, unknown>): Promise<ToolResponse>;
}

export const defineTool = (meta: PluginMeta): PluginMeta => meta;
