import { sessionStore } from '../../../utils/session-store.ts';
import type { ToolResponse } from '../../../types/common.ts';

export default {
  name: 'session-show-defaults',
  description: 'Show current session defaults.',
  schema: {},
  handler: async (): Promise<ToolResponse> => {
    const current = sessionStore.getAll();
    return { content: [{ type: 'text', text: JSON.stringify(current, null, 2) }], isError: false };
  },
};
