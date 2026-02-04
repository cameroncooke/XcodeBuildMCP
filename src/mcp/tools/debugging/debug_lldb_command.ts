import * as z from 'zod';
import type { ToolResponse } from '../../../types/common.ts';
import { createErrorResponse, createTextResponse } from '../../../utils/responses/index.ts';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.ts';
import { createTypedToolWithContext } from '../../../utils/typed-tool-factory.ts';
import {
  getDefaultDebuggerToolContext,
  type DebuggerToolContext,
} from '../../../utils/debugger/index.ts';

const baseSchemaObject = z.object({
  debugSessionId: z.string().optional().describe('default: current session'),
  command: z.string(),
  timeoutMs: z.number().int().positive().optional(),
});

const debugLldbCommandSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);

export type DebugLldbCommandParams = z.infer<typeof debugLldbCommandSchema>;

export async function debug_lldb_commandLogic(
  params: DebugLldbCommandParams,
  ctx: DebuggerToolContext,
): Promise<ToolResponse> {
  try {
    const output = await ctx.debugger.runCommand(params.debugSessionId, params.command, {
      timeoutMs: params.timeoutMs,
    });
    return createTextResponse(output.trim());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createErrorResponse('Failed to run LLDB command', message);
  }
}

export default {
  name: 'debug_lldb_command',
  description: 'Run LLDB command.',
  cli: {
    stateful: true,
  },
  schema: baseSchemaObject.shape,
  handler: createTypedToolWithContext<DebugLldbCommandParams, DebuggerToolContext>(
    debugLldbCommandSchema as unknown as z.ZodType<DebugLldbCommandParams, unknown>,
    debug_lldb_commandLogic,
    getDefaultDebuggerToolContext,
  ),
};
