import * as z from 'zod';
import type { ToolResponse } from '../../../types/common.ts';
import { createErrorResponse, createTextResponse } from '../../../utils/responses/index.ts';
import { createTypedToolWithContext } from '../../../utils/typed-tool-factory.ts';
import {
  getDefaultDebuggerToolContext,
  type DebuggerToolContext,
} from '../../../utils/debugger/index.ts';

const debugStackSchema = z.object({
  debugSessionId: z.string().optional().describe('default: current session'),
  threadIndex: z.number().int().nonnegative().optional(),
  maxFrames: z.number().int().positive().optional(),
});

export type DebugStackParams = z.infer<typeof debugStackSchema>;

export async function debug_stackLogic(
  params: DebugStackParams,
  ctx: DebuggerToolContext,
): Promise<ToolResponse> {
  try {
    const output = await ctx.debugger.getStack(params.debugSessionId, {
      threadIndex: params.threadIndex,
      maxFrames: params.maxFrames,
    });
    return createTextResponse(output.trim());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createErrorResponse('Failed to get stack', message);
  }
}

export const schema = debugStackSchema.shape;

export const handler = createTypedToolWithContext<DebugStackParams, DebuggerToolContext>(
  debugStackSchema,
  debug_stackLogic,
  getDefaultDebuggerToolContext,
);
