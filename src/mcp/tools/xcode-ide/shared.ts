import type { ToolResponse } from '../../../types/common.ts';
import type { XcodeToolsBridgeToolHandler } from '../../../integrations/xcode-tools-bridge/index.ts';
import { getServer } from '../../../server/server-state.ts';
import { getXcodeToolsBridgeToolHandler } from '../../../integrations/xcode-tools-bridge/index.ts';
import { createErrorResponse } from '../../../utils/responses/index.ts';

export async function withBridgeToolHandler(
  callback: (bridge: XcodeToolsBridgeToolHandler) => Promise<ToolResponse>,
): Promise<ToolResponse> {
  const bridge = getXcodeToolsBridgeToolHandler(getServer());
  if (!bridge) {
    return createErrorResponse('Bridge unavailable', 'Unable to initialize xcode tools bridge');
  }
  return callback(bridge);
}
