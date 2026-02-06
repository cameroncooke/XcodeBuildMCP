import * as z from 'zod';
import type { ToolResponse } from '../../../types/common.ts';
import { createErrorResponse, createTextResponse } from '../../../utils/responses/index.ts';
import { createTypedToolWithContext } from '../../../utils/typed-tool-factory.ts';
import {
  getDefaultDebuggerToolContext,
  type DebuggerToolContext,
} from '../../../utils/debugger/index.ts';

const debugBreakpointRemoveSchema = z.object({
  debugSessionId: z.string().optional().describe('default: current session'),
  breakpointId: z.number().int().positive(),
});

export type DebugBreakpointRemoveParams = z.infer<typeof debugBreakpointRemoveSchema>;

export async function debug_breakpoint_removeLogic(
  params: DebugBreakpointRemoveParams,
  ctx: DebuggerToolContext,
): Promise<ToolResponse> {
  try {
    const output = await ctx.debugger.removeBreakpoint(params.debugSessionId, params.breakpointId);
    return createTextResponse(`✅ Breakpoint ${params.breakpointId} removed.\n\n${output.trim()}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createErrorResponse('Failed to remove breakpoint', message);
  }
}

export const schema = debugBreakpointRemoveSchema.shape;

export const handler = createTypedToolWithContext<DebugBreakpointRemoveParams, DebuggerToolContext>(
  debugBreakpointRemoveSchema,
  debug_breakpoint_removeLogic,
  getDefaultDebuggerToolContext,
);
