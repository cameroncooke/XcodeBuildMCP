import type { ToolResponse } from '../../../types/common.ts';
import { getServer } from '../../../server/server-state.ts';
import { getXcodeToolsBridgeToolHandler } from '../../../integrations/xcode-tools-bridge/index.ts';
import { createErrorResponse } from '../../../utils/responses/index.ts';

export const schema = {};

export const handler = async (): Promise<ToolResponse> => {
  const bridge = getXcodeToolsBridgeToolHandler(getServer());
  if (!bridge) {
    return createErrorResponse('Bridge unavailable', 'Unable to initialize xcode tools bridge');
  }
  return bridge.statusTool();
};
