import * as z from 'zod';
import type { ToolResponse } from '../../../types/common.ts';
import { createErrorResponse } from '../../../utils/responses/index.ts';
import { withBridgeToolHandler } from './shared.ts';

const schemaObject = z.object({
  refresh: z
    .boolean()
    .optional()
    .describe('When true (default), refreshes from Xcode bridge before returning tool list.'),
});

type Params = z.infer<typeof schemaObject>;

export async function xcodeIdeListToolsLogic(params: Params): Promise<ToolResponse> {
  return withBridgeToolHandler(async (bridge) => bridge.listToolsTool({ refresh: params.refresh }));
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
  return xcodeIdeListToolsLogic(parsed.data);
};
