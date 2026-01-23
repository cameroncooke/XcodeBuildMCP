import * as z from 'zod';
import { sessionStore } from '../../../utils/session-store.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import type { ToolResponse } from '../../../types/common.ts';

const keys = [
  'projectPath',
  'workspacePath',
  'scheme',
  'configuration',
  'simulatorName',
  'simulatorId',
  'deviceId',
  'useLatestOS',
  'arch',
] as const;

const schemaObj = z.object({
  keys: z.array(z.enum(keys)).optional(),
  all: z.boolean().optional(),
});

type Params = z.infer<typeof schemaObj>;

export async function sessionClearDefaultsLogic(params: Params): Promise<ToolResponse> {
  if (params.all || !params.keys) sessionStore.clear();
  else sessionStore.clear(params.keys);
  return { content: [{ type: 'text', text: 'Session defaults cleared' }], isError: false };
}

export default {
  name: 'session-clear-defaults',
  description: 'Clear session defaults.',
  schema: schemaObj.shape,
  annotations: {
    title: 'Clear Session Defaults',
    destructiveHint: true,
  },
  handler: createTypedTool(schemaObj, sessionClearDefaultsLogic, getDefaultCommandExecutor),
};
