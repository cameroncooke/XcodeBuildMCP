import * as z from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { createErrorResponse, createTextResponse } from '../../../utils/responses/index.ts';
import { createTypedToolWithContext } from '../../../utils/typed-tool-factory.ts';
import {
  getDefaultDebuggerToolContext,
  type DebuggerToolContext,
} from '../../../utils/debugger/index.ts';

const debugDetachSchema = z.object({
  debugSessionId: z
    .string()
    .optional()
    .describe('Debug session ID to detach (defaults to current session)'),
});

export type DebugDetachParams = z.infer<typeof debugDetachSchema>;

export async function debug_detachLogic(
  params: DebugDetachParams,
  ctx: DebuggerToolContext,
): Promise<ToolResponse> {
  try {
    const targetId = params.debugSessionId ?? ctx.debugger.getCurrentSessionId();
    await ctx.debugger.detachSession(params.debugSessionId);

    return createTextResponse(`✅ Detached debugger session${targetId ? ` ${targetId}` : ''}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createErrorResponse('Failed to detach debugger', message);
  }
}

export default {
  name: 'debug_detach',
  description: 'Detach the current debugger session or a specific debugSessionId.',
  schema: debugDetachSchema.shape,
  handler: createTypedToolWithContext<DebugDetachParams, DebuggerToolContext>(
    debugDetachSchema,
    debug_detachLogic,
    getDefaultDebuggerToolContext,
  ),
};
