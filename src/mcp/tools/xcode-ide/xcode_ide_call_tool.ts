import * as z from 'zod';
import type { ToolResponse } from '../../../types/common.ts';
import { getServer } from '../../../server/server-state.ts';
import { getXcodeToolsBridgeToolHandler } from '../../../integrations/xcode-tools-bridge/index.ts';
import { createErrorResponse } from '../../../utils/responses/index.ts';

const schemaObject = z.object({
  remoteTool: z.string().min(1).describe('Exact remote Xcode MCP tool name.'),
  arguments: z
    .record(z.string(), z.unknown())
    .optional()
    .default({})
    .describe('Arguments payload to forward to the remote Xcode MCP tool.'),
  timeoutMs: z
    .number()
    .int()
    .min(100)
    .max(120000)
    .optional()
    .describe('Optional timeout override in milliseconds for this single tool call.'),
});

type Params = z.infer<typeof schemaObject>;

export async function xcodeIdeCallToolLogic(params: Params): Promise<ToolResponse> {
  const bridge = getXcodeToolsBridgeToolHandler(getServer());
  if (!bridge) {
    return createErrorResponse('Bridge unavailable', 'Unable to initialize xcode tools bridge');
  }

  return bridge.callToolTool({
    remoteTool: params.remoteTool,
    arguments: params.arguments ?? {},
    timeoutMs: params.timeoutMs,
  });
}

export const schema = schemaObject.shape;

export const handler = async (args: Record<string, unknown> = {}): Promise<ToolResponse> => {
  const parsed = schemaObject.safeParse(args);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
        return `${path}: ${issue.message}`;
      })
      .join('\n');
    return createErrorResponse('Parameter validation failed', details);
  }
  return xcodeIdeCallToolLogic(parsed.data);
};
