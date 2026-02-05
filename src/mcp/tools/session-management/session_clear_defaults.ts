import * as z from 'zod';
import { sessionStore } from '../../../utils/session-store.ts';
import { sessionDefaultKeys } from '../../../utils/session-defaults-schema.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import type { ToolResponse } from '../../../types/common.ts';

const keys = sessionDefaultKeys;

const schemaObj = z.object({
  keys: z.array(z.enum(keys)).optional(),
  all: z.boolean().optional(),
});

type Params = z.infer<typeof schemaObj>;

export async function sessionClearDefaultsLogic(params: Params): Promise<ToolResponse> {
  if (params.all || !params.keys) sessionStore.clear();
  else sessionStore.clear(params.keys);
  return { content: [{ type: 'text', text: 'Session defaults cleared' }], isError: false };
}

export const schema = schemaObj.shape;

export const handler = createTypedTool(
  schemaObj,
  sessionClearDefaultsLogic,
  getDefaultCommandExecutor,
);
