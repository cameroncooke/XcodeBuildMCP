import * as z from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { createErrorResponse, createTextResponse } from '../../../utils/responses/index.ts';
import { createTypedToolWithContext } from '../../../utils/typed-tool-factory.ts';
import {
  getDefaultDebuggerToolContext,
  type DebuggerToolContext,
} from '../../../utils/debugger/index.ts';

const debugVariablesSchema = z.object({
  debugSessionId: z.string().optional().describe('default: current session'),
  frameIndex: z.number().int().nonnegative().optional(),
});

export type DebugVariablesParams = z.infer<typeof debugVariablesSchema>;

export async function debug_variablesLogic(
  params: DebugVariablesParams,
  ctx: DebuggerToolContext,
): Promise<ToolResponse> {
  try {
    const output = await ctx.debugger.getVariables(params.debugSessionId, {
      frameIndex: params.frameIndex,
    });
    return createTextResponse(output.trim());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createErrorResponse('Failed to get variables', message);
  }
}

export default {
  name: 'debug_variables',
  description: 'Get frame variables.',
  cli: {
    stateful: true,
  },
  schema: debugVariablesSchema.shape,
  handler: createTypedToolWithContext<DebugVariablesParams, DebuggerToolContext>(
    debugVariablesSchema,
    debug_variablesLogic,
    getDefaultDebuggerToolContext,
  ),
};
