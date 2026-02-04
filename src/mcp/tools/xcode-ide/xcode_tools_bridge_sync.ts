import type { ToolResponse } from '../../../types/common.ts';
import { getServer } from '../../../server/server-state.ts';
import { getXcodeToolsBridgeManager } from '../../../integrations/xcode-tools-bridge/index.ts';
import { createErrorResponse } from '../../../utils/responses/index.ts';

export default {
  name: 'xcode_tools_bridge_sync',
  description: 'One-shot connect + tools/list sync (manual retry; avoids background prompt spam).',
  schema: {},
  annotations: {
    title: 'Sync Xcode Tools Bridge',
    readOnlyHint: false,
  },
  handler: async (): Promise<ToolResponse> => {
    const server = getServer();
    if (!server) {
      return createErrorResponse('Server not initialized', 'Unable to access server instance');
    }

    const manager = getXcodeToolsBridgeManager(server);
    if (!manager) {
      return createErrorResponse('Bridge unavailable', 'Unable to initialize xcode tools bridge');
    }

    return manager.syncTool();
  },
};
