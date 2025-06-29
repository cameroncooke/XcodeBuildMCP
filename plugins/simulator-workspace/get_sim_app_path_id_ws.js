import {
  getSimAppPathIdWsToolName,
  getSimAppPathIdWsToolDescription,
  getSimAppPathIdWsToolSchema,
  getSimAppPathIdWsToolHandler
} from '../../src/tools/app-path/index.js';

export default {
  name: getSimAppPathIdWsToolName,
  description: getSimAppPathIdWsToolDescription,
  schema: getSimAppPathIdWsToolSchema,
  handler: getSimAppPathIdWsToolHandler,
};