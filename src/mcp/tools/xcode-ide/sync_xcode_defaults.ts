/**
 * Sync Xcode Defaults Tool
 *
 * Reads Xcode's IDE state (active scheme and run destination) and updates
 * session defaults to match. This allows the agent to re-sync if the user
 * changes their selection in Xcode mid-session.
 *
 * Only visible when running under Xcode's coding agent.
 */

import type { ToolResponse } from '../../../types/common.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { createTypedToolWithContext } from '../../../utils/typed-tool-factory.ts';
import { sessionStore } from '../../../utils/session-store.ts';
import { readXcodeIdeState } from '../../../utils/xcode-state-reader.ts';
import { lookupBundleId } from '../../../utils/xcode-state-watcher.ts';
import * as z from 'zod';

const schemaObj = z.object({});

type Params = z.infer<typeof schemaObj>;

interface SyncXcodeDefaultsContext {
  executor: CommandExecutor;
  cwd: string;
  projectPath?: string;
  workspacePath?: string;
}

export async function syncXcodeDefaultsLogic(
  _params: Params,
  ctx: SyncXcodeDefaultsContext,
): Promise<ToolResponse> {
  const xcodeState = await readXcodeIdeState({
    executor: ctx.executor,
    cwd: ctx.cwd,
    projectPath: ctx.projectPath,
    workspacePath: ctx.workspacePath,
  });

  if (xcodeState.error) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to read Xcode IDE state: ${xcodeState.error}`,
        },
      ],
      isError: true,
    };
  }

  const synced: Record<string, string> = {};
  const notices: string[] = [];

  if (xcodeState.scheme) {
    synced.scheme = xcodeState.scheme;
    notices.push(`Scheme: ${xcodeState.scheme}`);
  }

  if (xcodeState.simulatorId) {
    synced.simulatorId = xcodeState.simulatorId;
    notices.push(`Simulator ID: ${xcodeState.simulatorId}`);
  }

  if (xcodeState.simulatorName) {
    synced.simulatorName = xcodeState.simulatorName;
    notices.push(`Simulator Name: ${xcodeState.simulatorName}`);
  }

  // Look up bundle ID if we have a scheme
  if (xcodeState.scheme) {
    const bundleId = await lookupBundleId(
      ctx.executor,
      xcodeState.scheme,
      ctx.projectPath,
      ctx.workspacePath,
    );
    if (bundleId) {
      synced.bundleId = bundleId;
      notices.push(`Bundle ID: ${bundleId}`);
    }
  }

  if (Object.keys(synced).length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'No scheme or simulator selection detected in Xcode IDE state.',
        },
      ],
      isError: false,
    };
  }

  sessionStore.setDefaults(synced);

  return {
    content: [
      {
        type: 'text',
        text: `Synced session defaults from Xcode IDE:\n- ${notices.join('\n- ')}`,
      },
    ],
    isError: false,
  };
}

export const schema = schemaObj.shape;

export const handler = createTypedToolWithContext(schemaObj, syncXcodeDefaultsLogic, () => ({
  executor: getDefaultCommandExecutor(),
  cwd: process.cwd(),
}));
