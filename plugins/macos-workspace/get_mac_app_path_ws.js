import {
  getMacAppPathWsToolName,
  getMacAppPathWsToolDescription,
  getMacAppPathWsToolSchema,
  getMacAppPathWsToolHandler
} from '../../src/tools/app-path/index.js';

export default {
  name: getMacAppPathWsToolName,
  description: getMacAppPathWsToolDescription,
  schema: getMacAppPathWsToolSchema,
  handler: getMacAppPathWsToolHandler,
};