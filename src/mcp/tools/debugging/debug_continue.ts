import * as z from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { createErrorResponse, createTextResponse } from '../../../utils/responses/index.ts';
import { createTypedToolWithContext } from '../../../utils/typed-tool-factory.ts';
import {
  getDefaultDebuggerToolContext,
  type DebuggerToolContext,
} from '../../../utils/debugger/index.ts';

const debugContinueSchema = z.object({
  debugSessionId: z
    .string()
    .optional()
    .describe('Debug session ID to resume (defaults to current session)'),
});

export type DebugContinueParams = z.infer<typeof debugContinueSchema>;

export async function debug_continueLogic(
  params: DebugContinueParams,
  ctx: DebuggerToolContext,
): Promise<ToolResponse> {
  try {
    const targetId = params.debugSessionId ?? ctx.debugger.getCurrentSessionId();
    await ctx.debugger.resumeSession(targetId ?? undefined);

    return createTextResponse(`✅ Resumed debugger session${targetId ? ` ${targetId}` : ''}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createErrorResponse('Failed to resume debugger', message);
  }
}

export default {
  name: 'debug_continue',
  description: 'Resume execution in the active debug session or a specific debugSessionId.',
  schema: debugContinueSchema.shape,
  handler: createTypedToolWithContext<DebugContinueParams, DebuggerToolContext>(
    debugContinueSchema,
    debug_continueLogic,
    getDefaultDebuggerToolContext,
  ),
};
