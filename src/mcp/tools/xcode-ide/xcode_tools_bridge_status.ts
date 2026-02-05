import type { ToolResponse } from '../../../types/common.ts';
import { getServer } from '../../../server/server-state.ts';
import { getXcodeToolsBridgeManager } from '../../../integrations/xcode-tools-bridge/index.ts';
import { createErrorResponse } from '../../../utils/responses/index.ts';

export const schema = {};

export const handler = async (): Promise<ToolResponse> => {
  const server = getServer();
  if (!server) {
    return createErrorResponse('Server not initialized', 'Unable to access server instance');
  }

  const manager = getXcodeToolsBridgeManager(server);
  if (!manager) {
    return createErrorResponse('Bridge unavailable', 'Unable to initialize xcode tools bridge');
  }

  return manager.statusTool();
};
