import * as z from 'zod';
import { ToolResponse } from '../../../types/common.ts';
import { createErrorResponse, createTextResponse } from '../../../utils/responses/index.ts';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.ts';
import { createTypedToolWithContext } from '../../../utils/typed-tool-factory.ts';
import {
  getDefaultDebuggerToolContext,
  type DebuggerToolContext,
  type BreakpointSpec,
} from '../../../utils/debugger/index.ts';

const baseSchemaObject = z.object({
  debugSessionId: z
    .string()
    .optional()
    .describe('Debug session ID to target (defaults to current session)'),
  file: z.string().optional().describe('Source file path for breakpoint'),
  line: z.number().int().positive().optional().describe('Line number for breakpoint'),
  function: z.string().optional().describe('Function name to break on'),
  condition: z.string().optional().describe('Optional condition expression for the breakpoint'),
});

const debugBreakpointAddSchema = z.preprocess(
  nullifyEmptyStrings,
  baseSchemaObject
    .refine((val) => !(val.file && val.function), {
      message: 'Provide either file/line or function, not both.',
    })
    .refine((val) => Boolean(val.function ?? (val.file && val.line !== undefined)), {
      message: 'Provide file + line or function.',
    })
    .refine((val) => !(val.line && !val.file), {
      message: 'file is required when line is provided.',
    }),
);

export type DebugBreakpointAddParams = z.infer<typeof debugBreakpointAddSchema>;

export async function debug_breakpoint_addLogic(
  params: DebugBreakpointAddParams,
  ctx: DebuggerToolContext,
): Promise<ToolResponse> {
  try {
    const spec: BreakpointSpec = params.function
      ? { kind: 'function', name: params.function }
      : { kind: 'file-line', file: params.file!, line: params.line! };

    const result = await ctx.debugger.addBreakpoint(params.debugSessionId, spec, {
      condition: params.condition,
    });

    return createTextResponse(`✅ Breakpoint ${result.id} set.\n\n${result.rawOutput.trim()}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createErrorResponse('Failed to add breakpoint', message);
  }
}

export default {
  name: 'debug_breakpoint_add',
  description: 'Add a breakpoint by file/line or function name for the active debug session.',
  schema: baseSchemaObject.shape,
  handler: createTypedToolWithContext<DebugBreakpointAddParams, DebuggerToolContext>(
    debugBreakpointAddSchema as unknown as z.ZodType<DebugBreakpointAddParams, unknown>,
    debug_breakpoint_addLogic,
    getDefaultDebuggerToolContext,
  ),
};
