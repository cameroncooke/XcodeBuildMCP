import {
  buildRunMacWsToolName,
  buildRunMacWsToolDescription,
  buildRunMacWsToolSchema,
  buildRunMacWsToolHandler
} from '../../src/tools/build-macos/index.js';

export default {
  name: buildRunMacWsToolName,
  description: buildRunMacWsToolDescription,
  schema: buildRunMacWsToolSchema,
  handler: buildRunMacWsToolHandler,
};