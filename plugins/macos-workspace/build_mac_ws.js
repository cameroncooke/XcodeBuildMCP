import {
  buildMacWsToolName,
  buildMacWsToolDescription,
  buildMacWsToolSchema,
  buildMacWsToolHandler
} from '../../src/tools/build-macos/index.js';

export default {
  name: buildMacWsToolName,
  description: buildMacWsToolDescription,
  schema: buildMacWsToolSchema,
  handler: buildMacWsToolHandler,
};