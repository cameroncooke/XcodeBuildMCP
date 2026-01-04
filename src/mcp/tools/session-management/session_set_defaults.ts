import * as z from 'zod';
import { sessionStore, type SessionDefaults } from '../../../utils/session-store.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import type { ToolResponse } from '../../../types/common.ts';

const baseSchema = z.object({
  projectPath: z
    .string()
    .optional()
    .describe(
      'Xcode project (.xcodeproj) path. Mutually exclusive with workspacePath. Required for most build/test tools when workspacePath is not set.',
    ),
  workspacePath: z
    .string()
    .optional()
    .describe(
      'Xcode workspace (.xcworkspace) path. Mutually exclusive with projectPath. Required for most build/test tools when projectPath is not set.',
    ),
  scheme: z
    .string()
    .optional()
    .describe(
      'Xcode scheme. Required by most build/test tools. Use list_schemes to discover available schemes before setting.',
    ),
  configuration: z.string().optional().describe('Build configuration, e.g. Debug or Release.'),
  simulatorName: z
    .string()
    .optional()
    .describe(
      'Simulator device name for simulator workflows. If simulatorId is also provided, simulatorId is preferred and simulatorName is ignored.',
    ),
  simulatorId: z
    .string()
    .optional()
    .describe(
      'Simulator UUID for simulator workflows. Preferred over simulatorName when both are provided.',
    ),
  deviceId: z.string().optional().describe('Physical device ID for device workflows.'),
  useLatestOS: z
    .boolean()
    .optional()
    .describe('When true, prefer the latest available OS for simulatorName lookups.'),
  arch: z.enum(['arm64', 'x86_64']).optional().describe('Target architecture for macOS builds.'),
  suppressWarnings: z
    .boolean()
    .optional()
    .describe('When true, warning messages are filtered from build output to conserve context'),
});

const schemaObj = baseSchema;

type Params = z.infer<typeof schemaObj>;

export async function sessionSetDefaultsLogic(params: Params): Promise<ToolResponse> {
  const notices: string[] = [];
  const current = sessionStore.getAll();
  const nextParams: Partial<SessionDefaults> = { ...params };

  const hasProjectPath =
    Object.prototype.hasOwnProperty.call(params, 'projectPath') && params.projectPath !== undefined;
  const hasWorkspacePath =
    Object.prototype.hasOwnProperty.call(params, 'workspacePath') &&
    params.workspacePath !== undefined;
  const hasSimulatorId =
    Object.prototype.hasOwnProperty.call(params, 'simulatorId') && params.simulatorId !== undefined;
  const hasSimulatorName =
    Object.prototype.hasOwnProperty.call(params, 'simulatorName') &&
    params.simulatorName !== undefined;

  if (hasProjectPath && hasWorkspacePath) {
    delete nextParams.projectPath;
    notices.push(
      'Both projectPath and workspacePath were provided; keeping workspacePath and ignoring projectPath.',
    );
  }

  if (hasSimulatorId && hasSimulatorName) {
    delete nextParams.simulatorName;
    notices.push(
      'Both simulatorId and simulatorName were provided; keeping simulatorId and ignoring simulatorName.',
    );
  }

  // Clear mutually exclusive counterparts before merging new defaults
  const toClear = new Set<keyof SessionDefaults>();
  if (
    Object.prototype.hasOwnProperty.call(nextParams, 'projectPath') &&
    nextParams.projectPath !== undefined
  ) {
    toClear.add('workspacePath');
    if (current.workspacePath !== undefined) {
      notices.push('Cleared workspacePath because projectPath was set.');
    }
  }
  if (
    Object.prototype.hasOwnProperty.call(nextParams, 'workspacePath') &&
    nextParams.workspacePath !== undefined
  ) {
    toClear.add('projectPath');
    if (current.projectPath !== undefined) {
      notices.push('Cleared projectPath because workspacePath was set.');
    }
  }
  if (
    Object.prototype.hasOwnProperty.call(nextParams, 'simulatorId') &&
    nextParams.simulatorId !== undefined
  ) {
    toClear.add('simulatorName');
    if (current.simulatorName !== undefined) {
      notices.push('Cleared simulatorName because simulatorId was set.');
    }
  }
  if (
    Object.prototype.hasOwnProperty.call(nextParams, 'simulatorName') &&
    nextParams.simulatorName !== undefined
  ) {
    toClear.add('simulatorId');
    if (current.simulatorId !== undefined) {
      notices.push('Cleared simulatorId because simulatorName was set.');
    }
  }

  if (toClear.size > 0) {
    sessionStore.clear(Array.from(toClear));
  }

  sessionStore.setDefaults(nextParams as Partial<SessionDefaults>);
  const updated = sessionStore.getAll();
  const noticeText = notices.length > 0 ? `\nNotices:\n- ${notices.join('\n- ')}` : '';
  return {
    content: [
      {
        type: 'text',
        text: `Defaults updated:\n${JSON.stringify(updated, null, 2)}${noticeText}`,
      },
    ],
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
