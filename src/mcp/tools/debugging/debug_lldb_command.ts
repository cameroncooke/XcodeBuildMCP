import * as z from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { createErrorResponse, createTextResponse } from '../../../utils/responses/index.ts';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.ts';
import { createTypedToolWithContext } from '../../../utils/typed-tool-factory.ts';
import {
  getDefaultDebuggerToolContext,
  type DebuggerToolContext,
} from '../../../utils/debugger/index.ts';

const debugLldbCommandSchema = z.preprocess(
  nullifyEmptyStrings,
  z.object({
    debugSessionId: z
      .string()
      .optional()
      .describe('Debug session ID to target (defaults to current session)'),
    command: z.string().describe('LLDB command to run (e.g., "continue", "thread backtrace")'),
    timeoutMs: z.number().int().positive().optional().describe('Override command timeout (ms)'),
  }),
);

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
  description: 'Run an arbitrary LLDB command within the active debug session.',
  schema: z.object({
    debugSessionId: z.string().optional(),
    command: z.string(),
    timeoutMs: z.number().int().positive().optional(),
  }).shape,
  handler: createTypedToolWithContext<DebugLldbCommandParams, DebuggerToolContext>(
    debugLldbCommandSchema as unknown as z.ZodType<DebugLldbCommandParams, unknown>,
    debug_lldb_commandLogic,
    getDefaultDebuggerToolContext,
  ),
};
