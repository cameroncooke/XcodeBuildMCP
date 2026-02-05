import * as z from 'zod';
import { persistSessionDefaultsPatch } from '../../../utils/config-store.ts';
import { removeUndefined } from '../../../utils/remove-undefined.ts';
import { sessionStore, type SessionDefaults } from '../../../utils/session-store.ts';
import { sessionDefaultsSchema } from '../../../utils/session-defaults-schema.ts';
import { createTypedToolWithContext } from '../../../utils/typed-tool-factory.ts';
import type { ToolResponse } from '../../../types/common.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { resolveSimulatorNameToId } from '../../../utils/simulator-resolver.ts';

const schemaObj = sessionDefaultsSchema.extend({
  persist: z
    .boolean()
    .optional()
    .describe('Persist provided defaults to .xcodebuildmcp/config.yaml'),
});

type Params = z.infer<typeof schemaObj>;

type SessionSetDefaultsContext = {
  executor: CommandExecutor;
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
    // Both provided - keep both, simulatorId takes precedence for tools
    notices.push(
      'Both simulatorId and simulatorName were provided; simulatorId will be used by tools.',
    );
  } else if (hasSimulatorName && !hasSimulatorId) {
    // Only simulatorName provided - resolve to simulatorId
    const resolution = await resolveSimulatorNameToId(context.executor, nextParams.simulatorName!);
    if (resolution.success) {
      nextParams.simulatorId = resolution.simulatorId;
      notices.push(
        `Resolved simulatorName "${nextParams.simulatorName}" to simulatorId: ${resolution.simulatorId}`,
      );
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to resolve simulator name: ${resolution.error}`,
          },
        ],
        isError: true,
      };
    }
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
  // Note: simulatorId/simulatorName are no longer mutually exclusive.
  // When simulatorName is provided, we auto-resolve to simulatorId and keep both.
  // Only clear simulatorName if simulatorId was explicitly provided without simulatorName.
  if (hasSimulatorId && !hasSimulatorName) {
    toClear.add('simulatorName');
    if (current.simulatorName !== undefined) {
      notices.push('Cleared simulatorName because simulatorId was explicitly set.');
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
      const { path } = await persistSessionDefaultsPatch({
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

export const schema = schemaObj.shape;

export const handler = createTypedToolWithContext(schemaObj, sessionSetDefaultsLogic, () => ({
  executor: getDefaultCommandExecutor(),
}));
