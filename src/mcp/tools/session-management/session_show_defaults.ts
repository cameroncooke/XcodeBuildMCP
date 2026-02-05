import { sessionStore } from '../../../utils/session-store.ts';
import type { ToolResponse } from '../../../types/common.ts';

export const schema = {};

export const handler = async (): Promise<ToolResponse> => {
  const current = sessionStore.getAll();
  return { content: [{ type: 'text', text: JSON.stringify(current, null, 2) }], isError: false };
};
