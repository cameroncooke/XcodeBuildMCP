import { z } from 'zod';
import { sessionStore, type SessionDefaults } from '../../../utils/session-store.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import type { ToolResponse } from '../../../types/common.ts';

const schemaObj = z.object({
  projectPath: z.string().optional(),
  workspacePath: z.string().optional(),
  scheme: z.string().optional(),
  configuration: z.string().optional(),
  simulatorName: z.string().optional(),
  simulatorId: z.string().optional(),
  deviceId: z.string().optional(),
  useLatestOS: z.boolean().optional(),
  arch: z.enum(['arm64', 'x86_64']).optional(),
});

type Params = z.infer<typeof schemaObj>;

export async function sessionSetDefaultsLogic(params: Params): Promise<ToolResponse> {
  sessionStore.setDefaults(params as Partial<SessionDefaults>);
  const current = sessionStore.getAll();
  return {
    content: [{ type: 'text', text: `Defaults updated:\n${JSON.stringify(current, null, 2)}` }],
    isError: false,
  };
}

export default {
  name: 'session-set-defaults',
  description:
    'Set the session defaults needed by many tools. Most tools require one or more session defaults to be set before they can be used. Agents should set the relevent defaults at the beginning of a session.',
  schema: schemaObj.shape,
  handler: createTypedTool(schemaObj, sessionSetDefaultsLogic, getDefaultCommandExecutor),
};
