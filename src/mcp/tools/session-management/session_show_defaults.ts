import { sessionStore } from '../../../utils/session-store.ts';
import type { ToolResponse } from '../../../types/common.ts';

export default {
  name: 'session-show-defaults',
  description: 'Show session defaults.',
  schema: {},
  annotations: {
    title: 'Show Session Defaults',
    readOnlyHint: true,
  },
  handler: async (): Promise<ToolResponse> => {
    const current = sessionStore.getAll();
    return { content: [{ type: 'text', text: JSON.stringify(current, null, 2) }], isError: false };
  },
};
