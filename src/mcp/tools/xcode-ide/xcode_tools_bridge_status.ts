import type { ToolResponse } from '../../../types/common.ts';
import { getServer } from '../../../server/server-state.ts';
import { getXcodeToolsBridgeManager } from '../../../integrations/xcode-tools-bridge/index.ts';
import { createErrorResponse } from '../../../utils/responses/index.ts';

export default {
  name: 'xcode_tools_bridge_status',
  description: 'Show xcrun mcpbridge availability and proxy tool sync status.',
  schema: {},
  annotations: {
    title: 'Xcode Tools Bridge Status',
    readOnlyHint: true,
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

    return manager.statusTool();
  },
};
