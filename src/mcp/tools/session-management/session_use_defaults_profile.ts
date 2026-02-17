import * as z from 'zod';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { persistActiveSessionDefaultsProfile } from '../../../utils/config-store.ts';
import { sessionStore } from '../../../utils/session-store.ts';
import type { ToolResponse } from '../../../types/common.ts';

const schemaObj = z.object({
  profile: z
    .string()
    .min(1)
    .optional()
    .describe('Activate a named session defaults profile (example: ios or watch).'),
  global: z.boolean().optional().describe('Activate the global unnamed defaults profile.'),
  persist: z
    .boolean()
    .optional()
    .describe('Persist activeSessionDefaultsProfile to .xcodebuildmcp/config.yaml.'),
});

type Params = z.input<typeof schemaObj>;

function normalizeProfileName(profile: string): string {
  return profile.trim();
}

function errorResponse(text: string): ToolResponse {
  return {
    content: [{ type: 'text', text }],
    isError: true,
  };
}

function resolveProfileToActivate(params: Params): string | null | undefined {
  if (params.global === true) return null;
  if (params.profile === undefined) return undefined;
  return normalizeProfileName(params.profile);
}

function validateProfileActivation(
  profileToActivate: string | null | undefined,
): ToolResponse | null {
  if (profileToActivate === undefined || profileToActivate === null) {
    return null;
  }

  if (profileToActivate.length === 0) {
    return errorResponse('Profile name cannot be empty.');
  }

  const profileExists = sessionStore.listProfiles().includes(profileToActivate);
  if (!profileExists) {
    return errorResponse(`Profile "${profileToActivate}" does not exist.`);
  }

  return null;
}

export async function sessionUseDefaultsProfileLogic(params: Params): Promise<ToolResponse> {
  const notices: string[] = [];

  if (params.global === true && params.profile !== undefined) {
    return errorResponse('Provide either global=true or profile, not both.');
  }

  const profileToActivate = resolveProfileToActivate(params);
  const validationError = validateProfileActivation(profileToActivate);
  if (validationError) {
    return validationError;
  }

  if (profileToActivate !== undefined) {
    sessionStore.setActiveProfile(profileToActivate);
  }

  const active = sessionStore.getActiveProfile();
  if (params.persist) {
    const { path } = await persistActiveSessionDefaultsProfile(active);
    notices.push(`Persisted active profile selection to ${path}`);
  }

  const activeLabel = active ?? 'global';
  const profiles = sessionStore.listProfiles();
  const current = sessionStore.getAll();

  return {
    content: [
      {
        type: 'text',
        text: [
          `Active defaults profile: ${activeLabel}`,
          `Known profiles: ${profiles.length > 0 ? profiles.join(', ') : '(none)'}`,
          `Current defaults: ${JSON.stringify(current, null, 2)}`,
          ...(notices.length > 0 ? [`Notices:`, ...notices.map((notice) => `- ${notice}`)] : []),
        ].join('\n'),
      },
    ],
    isError: false,
  };
}

export const schema = schemaObj.shape;

export const handler = createTypedTool(
  schemaObj,
  sessionUseDefaultsProfileLogic,
  getDefaultCommandExecutor,
);
