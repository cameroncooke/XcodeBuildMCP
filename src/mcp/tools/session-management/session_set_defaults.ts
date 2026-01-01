import * as z from 'zod';
import { sessionStore, type SessionDefaults } from '../../../utils/session-store.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import type { ToolResponse } from '../../../types/common.ts';

const baseSchema = z.object({
  projectPath: z.string().optional(),
  workspacePath: z.string().optional(),
  scheme: z.string().optional(),
  configuration: z.string().optional(),
  simulatorName: z.string().optional(),
  simulatorId: z.string().optional(),
  deviceId: z.string().optional(),
  useLatestOS: z.boolean().optional(),
  arch: z.enum(['arm64', 'x86_64']).optional(),
  suppressWarnings: z
    .boolean()
    .optional()
    .describe('When true, warning messages are filtered from build output to conserve context'),
});

const schemaObj = baseSchema
  .refine((v) => !(v.projectPath && v.workspacePath), {
    message: 'projectPath and workspacePath are mutually exclusive',
    path: ['projectPath'],
  })
  .refine((v) => !(v.simulatorId && v.simulatorName), {
    message: 'simulatorId and simulatorName are mutually exclusive',
    path: ['simulatorId'],
  });

type Params = z.infer<typeof schemaObj>;

export async function sessionSetDefaultsLogic(params: Params): Promise<ToolResponse> {
  // Clear mutually exclusive counterparts before merging new defaults
  const toClear = new Set<keyof SessionDefaults>();
  if (Object.prototype.hasOwnProperty.call(params, 'projectPath')) toClear.add('workspacePath');
  if (Object.prototype.hasOwnProperty.call(params, 'workspacePath')) toClear.add('projectPath');
  if (Object.prototype.hasOwnProperty.call(params, 'simulatorId')) toClear.add('simulatorName');
  if (Object.prototype.hasOwnProperty.call(params, 'simulatorName')) toClear.add('simulatorId');

  if (toClear.size > 0) {
    sessionStore.clear(Array.from(toClear));
  }

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
    'Set the session defaults needed by many tools. Most tools require one or more session defaults to be set before they can be used. Agents should set all relevant defaults up front in a single call (e.g., project/workspace, scheme, simulator or device ID, useLatestOS) to avoid iterative prompts; only set the keys your workflow needs.',
  schema: baseSchema.shape,
  annotations: {
    title: 'Set Session Defaults',
    destructiveHint: true,
  },
  handler: createTypedTool(schemaObj, sessionSetDefaultsLogic, getDefaultCommandExecutor),
};
