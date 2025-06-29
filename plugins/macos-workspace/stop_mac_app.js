import {
  stopMacAppToolName,
  stopMacAppToolDescription,
  stopMacAppToolSchema,
  stopMacAppToolHandler
} from '../../src/tools/launch/index.js';

export default {
  name: stopMacAppToolName,
  description: stopMacAppToolDescription,
  schema: stopMacAppToolSchema,
  handler: stopMacAppToolHandler,
};