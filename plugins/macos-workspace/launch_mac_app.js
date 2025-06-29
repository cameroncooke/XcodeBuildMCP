import {
  launchMacAppToolName,
  launchMacAppToolDescription,
  launchMacAppToolSchema,
  launchMacAppToolHandler
} from '../../src/tools/launch/index.js';

export default {
  name: launchMacAppToolName,
  description: launchMacAppToolDescription,
  schema: launchMacAppToolSchema,
  handler: launchMacAppToolHandler,
};