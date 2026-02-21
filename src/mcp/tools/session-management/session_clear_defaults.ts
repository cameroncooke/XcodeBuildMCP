import * as z from 'zod';
import { sessionStore } from '../../../utils/session-store.ts';
import { sessionDefaultKeys } from '../../../utils/session-defaults-schema.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import type { ToolResponse } from '../../../types/common.ts';

const keys = sessionDefaultKeys;

const schemaObj = z.object({
  keys: z.array(z.enum(keys)).optional(),
  profile: z
    .string()
    .min(1)
    .optional()
    .describe('Clear defaults for this named profile instead of the active profile.'),
  all: z
    .boolean()
    .optional()
    .describe(
      'Clear all defaults across global and named profiles. Cannot be combined with keys/profile.',
    ),
});

type Params = z.infer<typeof schemaObj>;

export async function sessionClearDefaultsLogic(params: Params): Promise<ToolResponse> {
  if (params.all) {
    if (params.profile !== undefined || params.keys !== undefined) {
      return {
        content: [
          {
            type: 'text',
            text: 'all=true cannot be combined with profile or keys.',
          },
        ],
        isError: true,
      };
    }

    sessionStore.clearAll();
    return { content: [{ type: 'text', text: 'All session defaults cleared' }], isError: false };
  }

  const profile = params.profile?.trim();
  if (profile !== undefined) {
    if (profile.length === 0) {
      return {
        content: [{ type: 'text', text: 'Profile name cannot be empty.' }],
        isError: true,
      };
    }

    if (!sessionStore.listProfiles().includes(profile)) {
      return {
        content: [{ type: 'text', text: `Profile "${profile}" does not exist.` }],
        isError: true,
      };
    }

    if (params.keys) {
      sessionStore.clearForProfile(profile, params.keys);
    } else {
      sessionStore.clearForProfile(profile);
    }

    return {
      content: [{ type: 'text', text: `Session defaults cleared for profile "${profile}"` }],
      isError: false,
    };
  }

  if (params.keys) {
    sessionStore.clear(params.keys);
  } else {
    sessionStore.clear();
  }

  return { content: [{ type: 'text', text: 'Session defaults cleared' }], isError: false };
}

export const schema = schemaObj.shape;

export const handler = createTypedTool(
  schemaObj,
  sessionClearDefaultsLogic,
  getDefaultCommandExecutor,
);
