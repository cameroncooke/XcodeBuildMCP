import * as z from 'zod';
import process from 'node:process';
import type { FileSystemExecutor } from '../../../utils/FileSystemExecutor.ts';
import { sessionStore, type SessionDefaults } from '../../../utils/session-store.ts';
import { getDefaultFileSystemExecutor } from '../../../utils/command.ts';
import { persistSessionDefaultsToProjectConfig } from '../../../utils/project-config.ts';
import { removeUndefined } from '../../../utils/remove-undefined.ts';
import { sessionDefaultsSchema } from '../../../utils/session-defaults-schema.ts';
import { createTypedToolWithContext } from '../../../utils/typed-tool-factory.ts';
import type { ToolResponse } from '../../../types/common.ts';

const schemaObj = sessionDefaultsSchema.extend({
  persist: z
    .boolean()
    .optional()
    .describe('Persist provided defaults to .xcodebuildmcp/config.yaml'),
});

type Params = z.infer<typeof schemaObj>;

type SessionSetDefaultsContext = {
  fs: FileSystemExecutor;
  cwd: string;
};

export async function sessionSetDefaultsLogic(
  params: Params,
  context: SessionSetDefaultsContext,
): Promise<ToolResponse> {
  const notices: string[] = [];
  const current = sessionStore.getAll();
  const { persist, ...rawParams } = params;
  const nextParams = removeUndefined(
    rawParams as Record<string, unknown>,
  ) as Partial<SessionDefaults>;

  const hasProjectPath =
    Object.prototype.hasOwnProperty.call(nextParams, 'projectPath') &&
    nextParams.projectPath !== undefined;
  const hasWorkspacePath =
    Object.prototype.hasOwnProperty.call(nextParams, 'workspacePath') &&
    nextParams.workspacePath !== undefined;
  const hasSimulatorId =
    Object.prototype.hasOwnProperty.call(nextParams, 'simulatorId') &&
    nextParams.simulatorId !== undefined;
  const hasSimulatorName =
    Object.prototype.hasOwnProperty.call(nextParams, 'simulatorName') &&
    nextParams.simulatorName !== undefined;

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

  if (Object.keys(nextParams).length > 0) {
    sessionStore.setDefaults(nextParams as Partial<SessionDefaults>);
  }

  if (persist) {
    if (Object.keys(nextParams).length === 0 && toClear.size === 0) {
      notices.push('No defaults provided to persist.');
    } else {
      const { path } = await persistSessionDefaultsToProjectConfig({
        fs: context.fs,
        cwd: context.cwd,
        patch: nextParams,
        deleteKeys: Array.from(toClear),
      });
      notices.push(`Persisted defaults to ${path}`);
    }
  }

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
  schema: schemaObj.shape,
  annotations: {
    title: 'Set Session Defaults',
    destructiveHint: true,
  },
  handler: createTypedToolWithContext(schemaObj, sessionSetDefaultsLogic, () => ({
    fs: getDefaultFileSystemExecutor(),
    cwd: process.cwd(),
  })),
};
