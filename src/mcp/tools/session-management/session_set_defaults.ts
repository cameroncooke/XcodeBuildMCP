import * as z from 'zod';
import { persistSessionDefaultsPatch } from '../../../utils/config-store.ts';
import { removeUndefined } from '../../../utils/remove-undefined.ts';
import { scheduleSimulatorDefaultsRefresh } from '../../../utils/simulator-defaults-refresh.ts';
import { sessionStore, type SessionDefaults } from '../../../utils/session-store.ts';
import { sessionDefaultsSchema } from '../../../utils/session-defaults-schema.ts';
import { createTypedToolWithContext } from '../../../utils/typed-tool-factory.ts';
import type { ToolResponse } from '../../../types/common.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';

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

  const selectorProvided = hasSimulatorId || hasSimulatorName;
  const simulatorIdChanged = hasSimulatorId && nextParams.simulatorId !== current.simulatorId;
  const simulatorNameChanged =
    hasSimulatorName && nextParams.simulatorName !== current.simulatorName;

  if (hasSimulatorId && hasSimulatorName) {
    // Both provided - keep both, simulatorId takes precedence for tools
    notices.push(
      'Both simulatorId and simulatorName were provided; simulatorId will be used by tools.',
    );
  } else if (hasSimulatorId && !hasSimulatorName) {
    toClear.add('simulatorName');
    if (current.simulatorName !== undefined) {
      notices.push(
        'Cleared simulatorName because simulatorId was set; background resolution will repopulate it.',
      );
    }
    if (simulatorIdChanged) {
      notices.push(
        `Set simulatorId to "${nextParams.simulatorId}". Simulator name and platform refresh scheduled in background.`,
      );
    }
  } else if (hasSimulatorName && !hasSimulatorId) {
    toClear.add('simulatorId');
    if (current.simulatorId !== undefined) {
      notices.push(
        'Cleared simulatorId because simulatorName was set; background resolution will repopulate it.',
      );
    }
    if (simulatorNameChanged) {
      notices.push(
        `Set simulatorName to "${nextParams.simulatorName}". Simulator ID and platform refresh scheduled in background.`,
      );
    }
  }

  if (selectorProvided) {
    const selectorChanged = simulatorIdChanged || simulatorNameChanged;
    if (selectorChanged) {
      toClear.add('simulatorPlatform');
      notices.push('Cleared simulatorPlatform because simulator selector changed.');
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

  const revision = sessionStore.getRevision();
  if (selectorProvided) {
    const defaultsForRefresh = sessionStore.getAll();
    scheduleSimulatorDefaultsRefresh({
      executor: context.executor,
      expectedRevision: revision,
      reason: 'session-set-defaults',
      persist: Boolean(persist),
      simulatorId: defaultsForRefresh.simulatorId,
      simulatorName: defaultsForRefresh.simulatorName,
      recomputePlatform: true,
    });
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
