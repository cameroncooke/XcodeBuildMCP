import type { ToolResponse } from '../../../types/common.ts';
import { getServer } from '../../../server/server-state.ts';
import { getXcodeToolsBridgeManager } from '../../../integrations/xcode-tools-bridge/index.ts';
import { createErrorResponse } from '../../../utils/responses/index.ts';

export default {
  name: 'xcode_tools_bridge_disconnect',
  description: 'Disconnect bridge and unregister proxied `xcode_tools_*` tools.',
  schema: {},
  annotations: {
    title: 'Disconnect Xcode Tools Bridge',
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

    return manager.disconnectTool();
  },
};
