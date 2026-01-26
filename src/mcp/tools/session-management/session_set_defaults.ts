import * as z from 'zod';
import { sessionStore, type SessionDefaults } from '../../../utils/session-store.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import type { ToolResponse } from '../../../types/common.ts';

const baseSchema = z.object({
  projectPath: z.string().optional().describe('xcodeproj path (xor workspacePath)'),
  workspacePath: z.string().optional().describe('xcworkspace path (xor projectPath)'),
  scheme: z.string().optional(),
  configuration: z
    .string()
    .optional()
    .describe("Build configuration for Xcode and SwiftPM tools (e.g. 'Debug' or 'Release')."),
  simulatorName: z.string().optional(),
  simulatorId: z.string().optional(),
  deviceId: z.string().optional(),
  useLatestOS: z.boolean().optional(),
  arch: z.enum(['arm64', 'x86_64']).optional(),
  suppressWarnings: z.boolean().optional(),
  derivedDataPath: z
    .string()
    .optional()
    .describe('Default DerivedData path for Xcode build/test/clean tools.'),
  preferXcodebuild: z
    .boolean()
    .optional()
    .describe('Prefer xcodebuild over incremental builds for Xcode build/test/clean tools.'),
  platform: z
    .string()
    .optional()
    .describe('Default device platform for device tools (e.g. iOS, watchOS).'),
  bundleId: z
    .string()
    .optional()
    .describe('Default bundle ID for launch/stop/log tools when working on a single app.'),
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
  description: 'Set the session defaults, should be called at least once to set tool defaults.',
  schema: baseSchema.shape,
  annotations: {
    title: 'Set Session Defaults',
    destructiveHint: true,
  },
  handler: createTypedTool(schemaObj, sessionSetDefaultsLogic, getDefaultCommandExecutor),
};
