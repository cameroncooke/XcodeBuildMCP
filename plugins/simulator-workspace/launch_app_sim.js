import {
  launchAppSimToolName,
  launchAppSimToolDescription,
  launchAppSimToolSchema,
  launchAppSimToolHandler
} from '../../src/tools/simulator/index.js';

export default {
  name: launchAppSimToolName,
  description: launchAppSimToolDescription,
  schema: launchAppSimToolSchema,
  handler: launchAppSimToolHandler,
};